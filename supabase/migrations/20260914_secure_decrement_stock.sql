-- ==============================================================================
-- Migration: 20260914_secure_decrement_stock.sql
-- Description: Security hardening for public.decrement_stock() function.
--
-- Safeguards:
-- 1. Sets search_path = 'public' to prevent search-path hijacking in SECURITY DEFINER.
-- 2. Validates that p_order_id is a valid UUID and corresponds to an existing row in public.orders.
-- 3. Enforces caller ownership: auth.uid() must match orders.user_id.
--    Raises 'Not authorized to modify stock for this order' if not authorized.
-- 4. Idempotency guard: checks public.inventory_transactions to prevent replay/duplicate
--    decrements for the same order and product.
-- 5. Keeps exact signature (p_product_id uuid, p_quantity integer, p_order_id text)
--    so existing client code continues working without changes.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_product_id uuid,
  p_quantity integer,
  p_order_id text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order_uuid uuid;
  v_order_user_id uuid;
  current_stock integer;
BEGIN
  -- 1. Validate requested quantity
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity: %', p_quantity;
  END IF;

  -- 2. Validate Order ID existence and format
  IF p_order_id IS NULL OR trim(p_order_id) = '' THEN
    RAISE EXCEPTION 'Not authorized to modify stock for this order';
  END IF;

  BEGIN
    v_order_uuid := p_order_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Not authorized to modify stock for this order';
  END;

  -- 3. Verify caller is authenticated and owns the order
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authorized to modify stock for this order';
  END IF;

  SELECT user_id INTO v_order_user_id
  FROM public.orders
  WHERE id = v_order_uuid;

  IF v_order_user_id IS NULL OR v_order_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to modify stock for this order';
  END IF;

  -- 4. Idempotency Guard: prevent duplicate stock decrements for the same order/product
  IF EXISTS (
    SELECT 1
    FROM public.inventory_transactions
    WHERE product_id = p_product_id
      AND order_id::text = p_order_id::text
      AND reason = 'order'
  ) THEN
    RAISE EXCEPTION 'Stock already decremented for this order/product';
  END IF;

  -- 5. Lock product record and verify stock availability
  SELECT stock_quantity INTO current_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock: requested %, available %', p_quantity, current_stock;
  END IF;

  -- 6. Atomically update product stock
  UPDATE public.products
  SET stock_quantity = current_stock - p_quantity,
      in_stock = (current_stock - p_quantity) > 0,
      updated_at = NOW()
  WHERE id = p_product_id;

  -- 7. Log inventory transaction ledger entry
  INSERT INTO public.inventory_transactions (
    product_id,
    quantity_change,
    reason,
    order_id
  )
  VALUES (
    p_product_id,
    -p_quantity,
    'order',
    p_order_id
  );

  RETURN TRUE;
END;
$function$;

-- Grant execution privilege to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer, text) TO authenticated;
