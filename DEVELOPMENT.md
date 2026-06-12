# Development Setup Guide

Complete guide to setting up FlowPay for local development.

## Prerequisites

### System Requirements
- macOS, Linux, or Windows (WSL2)
- Node.js 22.x LTS
- Yarn 1.22.x
- Git
- Docker (optional, for running services)

### Verify Installations
```bash
node --version    # Should be 22.x
yarn --version    # Should be 1.22.x
git --version     # Any recent version
```

## Installation Steps

### 1. Clone Repository
```bash
git clone https://github.com/bimbsdev/flowpay.git
cd flowpay-stellar
```

### 2. Install Dependencies
```bash
# Install all dependencies for both frontend and backend
yarn install

# This will install dependencies in:
# - ./node_modules (root)
# - ./frontend/node_modules
# - ./backend/node_modules
```

### 3. Environment Configuration

#### Backend Setup
```bash
cd backend
cp .env.example .env.development.local
```

Edit `.env.development.local` and configure:
- `NODE_ENV=development`
- `PORT=3000` (or your preferred port)
- `JWT_SECRET=your-secret-key-here`
- `DATABASE_URL=your-database-url`

#### Frontend Setup
```bash
cd frontend
cp .env.example .env.development.local
```

Edit `.env.development.local` and configure:
- `VITE_API_URL=http://localhost:3000` (match backend PORT)

### 4. Database Setup (if using TypeORM)

```bash
cd backend

# Run migrations
yarn typeorm migration:run

# Or generate new migration from entities
yarn typeorm migration:generate -- -n InitialSchema
```

## Running Locally

### Development Mode

#### Terminal 1 - Start Backend
```bash
yarn dev
# or specifically:
cd backend && yarn start:dev
```

Backend runs on `http://localhost:3000`

#### Terminal 2 - Start Frontend
```bash
cd frontend && yarn dev
```

Frontend runs on `http://localhost:5173`

### Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Documentation: http://localhost:3000/api

## Useful Commands

### Project Level
```bash
# Install dependencies
yarn install

# Run development servers (both frontend and backend)
yarn dev

# Build entire project
yarn build

# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Format all code
yarn format

# Lint all code
yarn lint

# Type check
yarn type-check
```

### Frontend Only
```bash
cd frontend

# Start dev server
yarn dev

# Build for production
yarn build

# Preview production build
yarn preview

# Run linter
yarn lint
```

### Backend Only
```bash
cd backend

# Start development server with hot reload
yarn start:dev

# Start production server
yarn start:prod

# Build
yarn build

# Run tests
yarn test

# Run e2e tests
yarn test:e2e

# Run linter
yarn lint
```

## Docker Setup (Optional)

### Run Services in Docker
```bash
# Build images
docker compose build

# Start services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

## Debugging

### Backend Debugging
```bash
cd backend

# Start with debugger
yarn start:debug

# Then connect with your debugger (VSCode, Chrome DevTools, etc.)
```

### Frontend Debugging
- Open browser DevTools (F12 or Cmd+Option+I)
- Use Vue/React DevTools extension

### VSCode Debug Configuration

Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Backend Debug",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/main.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
    }
  ]
}
```

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000 (macOS/Linux)
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 yarn dev
```

### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules yarn.lock
yarn install
```

### Yarn Workspace Issues
```bash
# Reset workspace state
yarn install --force
```

### Build Errors
```bash
# Clean build
yarn cache clean
rm -rf dist build
yarn build
```

## IDE/Editor Setup

### VSCode Extensions (Recommended)
- ESLint
- Prettier - Code formatter
- TypeScript Vue Plugin
- Thunder Client (or REST Client)
- Git Graph

### Settings (.vscode/settings.json)
```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true
  }
}
```

## Code Style

### TypeScript
- Use strict mode
- No `any` types
- Prefer interfaces over types
- Use meaningful variable names

### File Structure
```
backend/src/
├── app.module.ts      # Root module
├── app.controller.ts  # Root controller
├── auth/              # Feature module
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── auth.controller.ts
├── database/          # Database setup
└── main.ts            # Entry point
```

## Git Workflow

### Before Starting Work
```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Making Commits
```bash
git add .
git commit -m "type(scope): description"

# Example:
git commit -m "feat(payments): add streaming support"
```

### Pushing Changes
```bash
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Change PORT env var or kill process |
| Module errors | Run `yarn install` again |
| Type errors | Run `yarn type-check` |
| Format issues | Run `yarn format` |
| Test failures | Check `.env` file configuration |

## Getting Help

- Check existing issues on GitHub
- Review documentation in `/docs`
- Examine test files for examples
- Ask in project discussions

## Next Steps

1. Read [CONTRIBUTING.md](CONTRIBUTING.md)
2. Check [Architecture Documentation](docs/ARCHITECTURE.md)
3. Review [API Documentation](docs/API.md)
4. Start coding! 🚀
