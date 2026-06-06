# Getting Started with FlowPay

## Quick Start

### 1. Prerequisites

- Node.js 18+
- npm or yarn
- PostgreSQL (for database)
- Stellar account with testnet funds

### 2. Clone & Setup

```bash
# Clone the repository
git clone https://github.com/LawalRahman/flowpay.git
cd flowpay

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb flowpay

# Update DATABASE_URL in backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/flowpay

# Run Prisma migrations
cd backend
npx prisma migrate dev
```

### 4. Get Stellar Testnet Account

```bash
# Create account at https://stellar.expert/ or use StellarChain Faucet
# Fund with testnet XLM (10 free XLM daily)
# Store your secret key in backend/.env

STELLAR_SECRET_KEY=SBXXXXXXXXX...
```

### 5. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run start:dev
# Backend running at http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend running at http://localhost:3000
```

### 6. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

---

## Project Structure

```
flowpay/
├── frontend/               # React + Vite UI
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API clients
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Helper functions
│   │   └── App.tsx        # Main app component
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                # NestJS API
│   ├── src/
│   │   ├── auth/          # Authentication module
│   │   ├── workflows/     # Workflow management
│   │   ├── drips/         # Drip management
│   │   ├── payments/      # Stellar integration
│   │   ├── database/      # Database models
│   │   ├── app.module.ts  # Main module
│   │   └── main.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
│
├── contracts/              # Soroban smart contracts
│   ├── payment_pool.rs
│   ├── drip_distribution.rs
│   └── workflow_validator.rs
│
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEPLOYMENT.md
│
└── README.md
```

---

## First Workflow

### Step 1: Register

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### Step 2: Create Workflow

```bash
curl -X POST http://localhost:3001/api/workflows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lesson Completion Reward",
    "trigger": "lesson-completed",
    "conditions": ["score >= 80"],
    "actions": [{
      "type": "drip",
      "config": {
        "amount": 0.10,
        "frequency": "daily",
        "duration": 10
      }
    }],
    "active": true
  }'
```

### Step 3: Create Drip

```bash
curl -X POST http://localhost:3001/api/drips \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "workflow_1",
    "amount": 0.10,
    "currency": "XLM",
    "frequency": "daily",
    "duration": 10
  }'
```

### Step 4: Trigger Workflow

```bash
curl -X POST http://localhost:3001/api/workflows/workflow_1/execute \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "score": 92,
    "courseId": "react-basics"
  }'
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

### Database Connection Error

Verify PostgreSQL is running and DATABASE_URL is correct in `.env`

### Stellar Network Error

Ensure you have:
1. Valid Stellar secret key
2. Testnet account with XLM balance
3. Correct STELLAR_NETWORK setting

### Frontend Can't Connect to Backend

Ensure backend is running and VITE_API_URL in frontend `.env` matches backend URL

---

## Next Steps

1. Read [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for system design details
2. Check [API.md](./docs/API.md) for endpoint documentation
3. Review [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production setup
4. Explore the codebase and customize workflows for your use case
