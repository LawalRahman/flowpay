# API Documentation

Complete API reference for FlowPay backend endpoints.

## Base URL

```
Development: http://localhost:3000
Staging: https://staging-api.flowpay.dev
Production: https://api.flowpay.dev
```

## Authentication

All endpoints (except `/auth/*`) require JWT authentication.

**Header:**
```
Authorization: Bearer <jwt_token>
```

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Auth Endpoints

### POST /auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "name": "John Doe",
  "address": "GXXXXXXXXX"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "token": "eyJhbGc..."
  }
}
```

### POST /auth/login

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "expiresIn": 86400
  }
}
```

### POST /auth/refresh

Refresh JWT token.

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "expiresIn": 86400
  }
}
```

## Payments Endpoints

### GET /payments

List all payments for authenticated user.

**Query Parameters:**
- `status` - Filter by status (PENDING, COMPLETED, FAILED)
- `skip` - Pagination offset (default: 0)
- `take` - Pagination limit (default: 20, max: 100)

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": "payment-123",
      "to": "GYYYYYYYYYY",
      "amount": 1000000,
      "status": "COMPLETED",
      "txHash": "abc123...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /payments

Create a new payment.

**Request:**
```json
{
  "to": "GYYYYYYYYYY",
  "amount": 1000000,
  "description": "Payment for services"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "id": "payment-123",
    "to": "GYYYYYYYYYY",
    "amount": 1000000,
    "status": "PENDING",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### GET /payments/:id

Get payment details by ID.

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "id": "payment-123",
    "to": "GYYYYYYYYYY",
    "amount": 1000000,
    "status": "COMPLETED",
    "txHash": "abc123...",
    "txLedger": 12345,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### DELETE /payments/:id

Cancel a pending payment.

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "message": "Payment cancelled successfully"
  }
}
```

## Drips Endpoints

### GET /drips

List all drips for authenticated user.

**Query Parameters:**
- `status` - Filter by status (SCHEDULED, ACTIVE, PAUSED, COMPLETED)
- `skip` - Pagination offset
- `take` - Pagination limit

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": "drip-123",
      "to": "GYYYYYYYYYY",
      "amountPerInterval": 100000,
      "intervalSeconds": 86400,
      "status": "ACTIVE",
      "startTime": "2024-01-01T00:00:00Z",
      "totalDripped": 300000,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /drips

Create a new drip stream.

**Request:**
```json
{
  "to": "GYYYYYYYYYY",
  "amountPerInterval": 100000,
  "intervalSeconds": 86400,
  "durationSeconds": 2592000,
  "startTime": "2024-01-01T00:00:00Z",
  "description": "Monthly payment"
}
```

**Response:** 201 Created
```json
{
  "success": true,
  "data": {
    "id": "drip-123",
    "to": "GYYYYYYYYYY",
    "status": "SCHEDULED",
    "sorobanContractId": "CAC3BVQ4..."
  }
}
```

### PATCH /drips/:id

Update drip status.

**Request:**
```json
{
  "status": "PAUSED"
}
```

**Response:** 200 OK

### GET /drips/:id/history

Get drip execution history.

**Response:** 200 OK
```json
{
  "success": true,
  "data": {
    "drip": { /* drip object */ },
    "executions": [
      {
        "timestamp": "2024-01-02T00:00:00Z",
        "txHash": "abc123...",
        "amount": 100000
      }
    ]
  }
}
```

## Workflows Endpoints

### GET /workflows

List all workflows.

**Response:** 200 OK
```json
{
  "success": true,
  "data": [
    {
      "id": "workflow-123",
      "name": "Auto-save",
      "enabled": true,
      "executionCount": 5,
      "lastExecutedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### POST /workflows

Create a new workflow.

**Request:**
```json
{
  "name": "Auto-save",
  "description": "Save 10% of balance weekly",
  "triggers": [
    {
      "type": "SCHEDULE",
      "cron": "0 0 * * 0"
    }
  ],
  "actions": [
    {
      "type": "PAYMENT",
      "to": "GSAVINGS...",
      "amount": "BALANCE * 0.1"
    }
  ]
}
```

**Response:** 201 Created

### PATCH /workflows/:id

Update workflow.

**Request:**
```json
{
  "enabled": false
}
```

**Response:** 200 OK

### DELETE /workflows/:id

Delete workflow.

**Response:** 200 OK

## Error Codes

| Code | Message | HTTP Status |
|------|---------|-------------|
| INVALID_CREDENTIALS | Email or password incorrect | 401 |
| UNAUTHORIZED | Missing or invalid token | 401 |
| USER_NOT_FOUND | User does not exist | 404 |
| INSUFFICIENT_BALANCE | Account balance too low | 400 |
| INVALID_STELLAR_ADDRESS | Invalid Stellar address format | 400 |
| PAYMENT_FAILED | Payment submission failed | 500 |
| DRIP_LIMIT_EXCEEDED | Maximum drips reached | 400 |
| INVALID_WORKFLOW | Workflow configuration invalid | 400 |
| RATE_LIMITED | Too many requests | 429 |

## Rate Limiting

- **Default:** 100 requests per minute per user
- **Auth endpoints:** 5 requests per minute per IP
- **Payment submission:** 10 requests per minute per user

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067860
```

## Pagination

Results use cursor-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "total": 500,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

## Webhook Events

Subscribe to events via webhook:

```
POST /webhooks/subscribe
{
  "url": "https://example.com/webhook",
  "events": ["payment.completed", "drip.executed"]
}
```

**Events:**
- `payment.completed` - Payment successfully submitted
- `payment.failed` - Payment submission failed
- `drip.executed` - Drip executed successfully
- `workflow.triggered` - Workflow triggered
