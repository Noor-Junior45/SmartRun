# CHAOS_TESTS.md (Edge-Case & cURL Test Suite)

## 1. Test Existing Account Welcome Email Rejection
```bash
curl -X POST http://localhost:3000/api/auth/send-welcome-email \
  -H "Content-Type: application/json" \
  -d '{"email":"gauravgiri123344@gmail.com","name":"Gaurav Giri","isNewAccount":false}'
# Expectation: 200 OK with {"success":true,"message":"Welcome email skipped: user already has an established account.","alreadySent":true}
```

## 2. Test Dedicated Email Senders Dispatch
```bash
# Test Order Confirmation Email (Sender: order@smartrun.in)
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"type":"order_confirmation","to":"test@example.com","customerName":"Ramesh Kumar","order":{"id":"DE7A0E6C","status":"confirmed","totalAmount":1500,"address":"Kasba","area":"South Kolkata","pincode":"700042"}}'

# Test Security Login Notification (Sender: alert@smartrun.in)
curl -X POST http://localhost:3000/api/auth/login-notification \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Ramesh Kumar","phone":"9876543210","loginMethod":"Email & Password","isNewAccount":false}'
```

## 3. Test Server-Authoritative Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Content-Type: application/json"
# Expectation: 200 OK with {"success":true,"message":"Logged out successfully"} and Set-Cookie clearing smartrun_session
```
