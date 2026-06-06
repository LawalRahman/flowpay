# FlowPay – Implementation Guide

## Event-Driven Micropayments on Stellar (Drips Architecture)

---

# 1. Project Architecture Overview

FlowPay is structured as a **fully separated full-stack system** with independent frontend and backend services.

This separation ensures:

* Clean scalability
* Independent deployment pipelines
* Easier debugging and testing
* Clear responsibility boundaries
* Better alignment with production-grade systems

---

## Repository Structure

```
flowpay/
│
├── frontend/          # React + Vite Application (UI Layer)
│
├── backend/           # NestJS API + Blockchain Logic
│
├── contracts/         # Soroban Smart Contracts
│
├── docs/              # Documentation
│
└── README.md
```

---

# 2. Frontend (React + Vite)

## Tech Stack

* React 19
* Vite
* TypeScript
* Tailwind CSS
* ShadCN UI
* React Router
* TanStack Query
* Framer Motion

---

## Responsibilities

The frontend is responsible for:

* User authentication UI
* Wallet connection (Stellar / Freighter)
* Workflow builder interface
* Dashboard analytics
* Transaction history view
* Drip configuration UI

---

## Key Pages

### `/login`

* Authentication entry point

### `/dashboard`

* Overview of earnings, workflows, and activity

### `/workflows`

* Create and manage event-driven payment workflows

### `/drips`

* Configure continuous reward streams (Stellar Drips)

### `/transactions`

* View all Stellar payments

---

## Frontend Data Flow

```
User Action
   ↓
React UI Event
   ↓
API Request (Axios / Fetch)
   ↓
Backend (NestJS)
   ↓
Stellar Transaction Response
   ↓
UI Update (React Query)
```

---

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

---

# 3. Backend (NestJS API Layer)

## Tech Stack

* NestJS
* TypeScript
* Prisma ORM
* PostgreSQL
* Stellar SDK
* Soroban SDK

---

## Responsibilities

The backend handles:

* Event hook processing
* Workflow evaluation engine
* Drip execution logic
* Payment routing
* Stellar transaction signing
* Database persistence
* Security validation

---

## Core Modules

### Auth Module

* JWT authentication
* Role-based access control

### Workflow Engine

* Trigger evaluation
* Condition checking
* Action execution

### Drip Engine (Core Innovation)

Handles continuous or scheduled payments:

* Start drip
* Update drip
* Stop drip
* Execute drip cycles

### Payment Module

* Stellar transaction creation
* USDC/XLM transfers
* Path payments

---

## Example Event Hook

```http
POST /hooks/lesson-completed
```

```json
{
  "userId": "123",
  "score": 92,
  "courseId": "react-basics"
}
```

Backend flow:

1. Validate event
2. Match workflow
3. Execute drip logic
4. Trigger Stellar payment
5. Store transaction

---

## Backend Setup

```bash
cd backend
npm install
npm run start:dev
```

---

# 4. Smart Contracts (Soroban Layer)

Used for:

* Payment pool management
* Drip validation rules
* Workflow integrity checks

Key functions:

* `createDrip()`
* `updateDrip()`
* `executeDrip()`
* `validateWorkflow()`

---

# 5. Drips System (Core Concept)

Unlike one-time payments, FlowPay introduces **continuous value streams**.

## Example:

### One-Time Payment

```
Task Completed → $1 paid once
```

### Drip Payment

```
Task Completed → $0.10/day for 10 days
```

or

```
User Active → continuous reward stream
User Inactive → drip stops automatically
```

This creates:

* Retention incentives
* Ongoing engagement
* Fair value distribution over time

---

# 6. Communication Flow

```
React Frontend
      ↓
NestJS Backend
      ↓
Workflow Engine
      ↓
Drip Engine
      ↓
Soroban Smart Contract
      ↓
Stellar Network
      ↓
User Wallet
```

---

# 7. Environment Variables

## Frontend

```
VITE_API_URL=
VITE_STELLAR_NETWORK=
```

## Backend

```
DATABASE_URL=
JWT_SECRET=
STELLAR_SECRET_KEY=
STELLAR_NETWORK_PASSPHRASE=
```

---

# 8. Deployment

## Frontend

* Vercel / Netlify

## Backend

* Railway / Render

## Database

* Neon PostgreSQL

---

# 9. Key Design Principle

> Frontend and backend are fully decoupled systems communicating only via secure APIs.

This ensures:

* Scalability
* Security
* Maintainability
* Production readiness

---

# 10. Summary

FlowPay is built as a modular, production-grade system where:

* React + Vite handles user experience
* NestJS handles business logic
* Soroban enforces financial integrity
* Stellar enables global micropayments
* Drips enable continuous value streaming

Together, they form a programmable payment infrastructure for the future of digital economies.
