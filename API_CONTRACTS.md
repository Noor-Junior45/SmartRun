# API_CONTRACTS.md (Strict Schema Lock)

## 1. POST `/api/auth/send-welcome-email`
- **Request Payload**:
  ```json
  {
    "email": "user@example.com",
    "name": "Customer Name",
    "userId": "uuid-or-phone",
    "isNewAccount": true,
    "force": false
  }
  ```
- **Response**:
  - `200 OK`: `{"success": true, "message": "Welcome email successfully dispatched."}`
  - `200 OK`: `{"success": true, "message": "Welcome email skipped: user already has an established account.", "alreadySent": true}`
- **Sender**: `SmartRun <welcome@smartrun.in>`

## 2. POST `/api/auth/login-notification`
- **Request Payload**:
  ```json
  {
    "email": "user@example.com",
    "name": "Customer Name",
    "userId": "uuid-or-phone",
    "phone": "8777400280",
    "loginMethod": "Phone Number & OTP",
    "isNewAccount": false
  }
  ```
- **Response**:
  - `200 OK`: `{"success": true, "message": "Security login notification successfully dispatched."}`
- **Sender**: `SmartRun Security <alert@smartrun.in>`

## 3. POST `/api/send-email` (Order Delivered & Tax Invoice PDF)
- **Request Payload**:
  ```json
  {
    "type": "order_delivered",
    "to": "customer@example.com",
    "customerName": "Customer Name",
    "order": { "id": "DE7A0E6C", "status": "delivered", "totalAmount": 1450 }
  }
  ```
- **Response**:
  - `200 OK`: `{"success": true, "message": "Email sent successfully"}`
- **Sender**: `SmartRun Orders <order@smartrun.in>`
- **Attachment**: `SmartRun-Invoice-DE7A0E6C.pdf`

## 4. POST `/api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{"success": true, "message": "Logged out successfully"}`
- **Cookies**: Clears `smartrun_session` httpOnly cookie.

## 5. GET `/api/version` & `/version.json`
- **Response**:
  ```json
  {
    "success": true,
    "version": "1.1.3",
    "versionCode": 14,
    "buildId": "v1.1.3-14",
    "builtAt": "2026-10-23T18:41:00.000Z",
    "serverStartedAt": "...",
    "environment": "development|production",
    "timestamp": 1792780860000
  }
  ```

