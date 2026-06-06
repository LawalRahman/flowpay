# API Documentation

## Base URL

```
http://localhost:3001/api
```

## Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

---

## Authentication Endpoints

### Register

```http
POST /auth/register
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Login

```http
POST /auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## Workflows Endpoints

### List Workflows

```http
GET /workflows
```

**Authentication:** Required

**Response:**
```json
[
  {
    "id": "workflow_1",
    "userId": "user_123",
    "name": "Lesson Completion Reward",
    "trigger": "lesson-completed",
    "conditions": ["score >= 80"],
    "actions": [
      {
        "type": "drip",
        "config": {
          "amount": 10,
          "frequency": "daily"
        }
      }
    ],
    "active": true,
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

### Create Workflow

```http
POST /workflows
```

**Authentication:** Required

**Request:**
```json
{
  "name": "Lesson Completion Reward",
  "trigger": "lesson-completed",
  "conditions": ["score >= 80"],
  "actions": [
    {
      "type": "drip",
      "config": {
        "amount": 10,
        "frequency": "daily",
        "duration": 10
      }
    }
  ],
  "active": true
}
```

### Update Workflow

```http
PATCH /workflows/:id
```

**Authentication:** Required

### Delete Workflow

```http
DELETE /workflows/:id
```

**Authentication:** Required

### Execute Workflow

```http
POST /workflows/:id/execute
```

**Authentication:** Required

**Request:**
```json
{
  "userId": "user_123",
  "eventType": "lesson-completed",
  "payload": {
    "score": 92,
    "courseId": "react-basics"
  }
}
```

---

## Drips Endpoints

### List Drips

```http
GET /drips
```

**Authentication:** Required

### Create Drip

```http
POST /drips
```

**Authentication:** Required

**Request:**
```json
{
  "workflowId": "workflow_1",
  "amount": 0.10,
  "currency": "XLM",
  "frequency": "daily",
  "duration": 10
}
```

### Update Drip

```http
PATCH /drips/:id
```

**Authentication:** Required

### Delete Drip

```http
DELETE /drips/:id
```

**Authentication:** Required

### Execute Drip

```http
POST /drips/:id/execute
```

**Authentication:** Required

---

## Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Invalid credentials",
  "error": "Bad Request"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
