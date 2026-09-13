-- ============================================================================
-- Consolidated migration: admin read access, secure order cancellation,
-- refund tracking, dynamic fee policy, and OTP phone-linking sync.
--
-- SCOPE NOTE: this file captures everything applied directly to the live
-- database during this session that wasn't already tracked in the existing
-- 3 migration files. It does NOT re-declare pre-existing tables (orders,
-- order_items, products, admin_users) since those already exist in
-- production and predate migration tracking -- only the NEW columns/
-- policies/functions added to them are included here.
--
-- For a fully authoritative, 100% complete schema snapshot (including the
-- original DDL of orders/products/admin_users), run `supabase db pull`
-- with the Supabase CLI against this project -- that does a proper
-- pg_dump-based extraction and should be treated as the source of truth
-- going forward, with this file as a readable changelog of intent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. New columns on orders (Razorpay tracking, extended fee breakdown, refund)
-- ----------------------------------------------------------------------------
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS rain_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS surge_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS product_handling_fee NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS fee_breakdown JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS refund_error TEXT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_refund_status;
ALTER TABLE public.orders ADD CONSTRAINT chk_refund_status
  CHECK (refund_status = ANY (ARRAY['not_applicable'::text, 'pending'::text, 'completed'::text, 'manual_processing_required'::text]));

-- ----------------------------------------------------------------------------
-- 2. Admin read access -- was missing entirely on orders/order_items/
--    user_profiles/saved_addresses (only admin UPDATE existed on orders)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all user profiles"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can view all saved addresses" ON public.saved_addresses;
CREATE POLICY "Admins can view all saved addresses"
  ON public.saved_addresses FOR SELECT TO authenticated
  USING (private.is_admin());

-- ----------------------------------------------------------------------------
-- 3. Admin order details view (single-query source for the admin panel)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.admin_order_details AS
SELECT
  o.id, o.status, o.placed_at, o.packed_at, o.shipped_at, o.delivered_at,
  o.cancelled_at, o.cancel_reason,
  o.recipient_name, o.recipient_phone, o.recipient_email,
  o.address_line1, o.address_line2, o.city, o.state, o.pincode, o.address_label,
  o.subtotal, o.discount_amount, o.fees, o.delivery_fee, o.handling_fee,
  o.rain_fee, o.surge_fee, o.total_amount,
  o.payment_method, o.payment_status, o.razorpay_payment_id, o.razorpay_order_id,
  o.refund_status, o.refund_error,
  o.user_id, up.full_name AS customer_full_name,
  d.status AS delivery_status, d.estimated_delivery_at, d.actual_delivery_at,
  (SELECT jsonb_agg(jsonb_build_object(
      'product_name', oi.product_name, 'quantity', oi.quantity,
      'price', oi.price_at_purchase, 'image', oi.product_image
    )) FROM public.order_items oi WHERE oi.order_id = o.id) AS items
FROM public.orders o
LEFT JOIN public.user_profiles up ON up.user_id = o.user_id
LEFT JOIN public.deliveries d ON d.order_id = o.id;

ALTER VIEW public.admin_order_details SET (security_invoker = true);
GRANT SELECT ON public.admin_order_details TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. app_settings -- dynamic fee policy storage
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system'
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on app_settings" ON public.app_settings;
CREATE POLICY "Allow public read access on app_settings"
  ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow service role to manage app_settings" ON public.app_settings;
CREATE POLICY "Allow service role to manage app_settings"
  ON public.app_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.app_settings (key, value, updated_by)
VALUES (
  'fee_policy',
  '{
    "freeDeliveryThreshold": 0, "baseDeliveryFee": 0, "handlingFee": 0,
    "rainFee": {"enabled": false, "amount": 0, "label": "Rain / Weather Surcharge"},
    "surgeFee": {"enabled": false, "amount": 0, "label": "Peak Demand Surge"},
    "customFees": [], "productCharges": {}, "productChargeMode": "per_item"
  }'::jsonb,
  'initial_zero_setup'
)
ON CONFLICT (key) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Order cancellation + refund-flagging functions
--    NOTE: public.cancel_order() is ADMIN-ONLY (raises unless private.is_admin()).
--    public.customer_cancel_order() is the separate customer-facing self-
--    service version -- enforces ownership + 2-minute window + status checks.
--    Do not merge these; the frontend calls customer_cancel_order() for the
--    self-service cancel button.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_cancel_order(p_order_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This order does not belong to you');
  END IF;

  IF lower(v_order.status) IN (
    'packing','packed','shipped','out_for_delivery','near_destination','delivered','cancelled','failed'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', CASE lower(v_order.status)
        WHEN 'cancelled' THEN 'Order is already cancelled'
        WHEN 'delivered' THEN 'Order is already delivered'
        WHEN 'packing' THEN 'Order is currently being packed'
        WHEN 'packed' THEN 'Order is currently being packed'
        ELSE 'Order is already out for delivery'
      END
    );
  END IF;

  IF v_order.placed_at IS NULL OR now() - v_order.placed_at > interval '2 minutes' THEN
    RETURN jsonb_build_object('success', false, 'error', '2-minute cancellation window has expired');
  END IF;

  IF NOT v_order.stock_restocked THEN
    FOR v_item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = p_order_id
    LOOP
      IF v_item.product_id IS NOT NULL THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + v_item.quantity, in_stock = true
        WHERE id = v_item.product_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.orders
  SET status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason,
      stock_restocked = true,
      refund_status = CASE WHEN v_order.payment_status = 'paid' THEN 'pending' ELSE 'not_applicable' END,
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true, 'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'razorpay_payment_id', v_order.razorpay_payment_id,
    'total_amount', v_order.total_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.customer_cancel_order(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_refund_manual_processing(p_order_id uuid, p_error text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.user_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This order does not belong to you');
  END IF;

  UPDATE public.orders
  SET refund_status = 'manual_processing_required', refund_error = p_error, updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_refund_manual_processing(uuid, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. OTP phone-linking: auto-sync auth.users.phone -> user_profiles.phone
--    once verified, and send Fast2SMS OTPs via Supabase Vault (never plaintext)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_auth_phone_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.phone_confirmed_at IS NOT NULL THEN
    UPDATE public.user_profiles
    SET phone = RIGHT(REGEXP_REPLACE(NEW.phone, '[^0-9]', '', 'g'), 10), updated_at = now()
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_phone_confirmed ON auth.users;
CREATE TRIGGER on_auth_phone_confirmed
  AFTER UPDATE OF phone ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_auth_phone_to_profile();

-- Requires: run once manually in the SQL editor (NOT safe to commit a real
-- key here) --
--   select vault.create_secret('<your-fast2sms-api-key>', 'fast2sms_api_key',
--     'Fast2SMS API key for OTP delivery via send_sms_fast2sms hook');
CREATE OR REPLACE FUNCTION public.send_sms_fast2sms(event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  phone_num text;
  otp_code text;
  fast2sms_key text;
  request_id bigint;
  resp_status int;
  resp_content text;
  attempts int := 0;
BEGIN
  SELECT decrypted_secret INTO fast2sms_key
  FROM vault.decrypted_secrets WHERE name = 'fast2sms_api_key';

  phone_num := RIGHT(REGEXP_REPLACE(event->'user'->>'phone', '[^0-9]', '', 'g'), 10);
  otp_code := event->'sms'->>'otp';

  SELECT net.http_post(
    url := 'https://www.fast2sms.com/dev/bulkV2',
    headers := jsonb_build_object('authorization', fast2sms_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object('route', 'q', 'message', 'Your SmartRun verification code is ' || otp_code,
      'language', 'english', 'flash', 0, 'numbers', phone_num)
  ) INTO request_id;

  WHILE attempts < 10 LOOP
    SELECT status_code, content INTO resp_status, resp_content
    FROM net._http_response WHERE id = request_id;
    IF resp_status IS NOT NULL THEN EXIT; END IF;
    PERFORM pg_sleep(0.12);
    attempts := attempts + 1;
  END LOOP;

  IF resp_status IS NULL THEN
    RETURN jsonb_build_object('error', 'SMS provider did not respond in time');
  ELSIF resp_status = 200 THEN
    RETURN jsonb_build_object('success', true);
  ELSE
    RETURN jsonb_build_object('error', 'Fast2SMS error (' || resp_status || '): ' || coalesce(resp_content, 'no details'));
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM);
END;
$function$;
