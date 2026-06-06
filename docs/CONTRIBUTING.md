# Contributing to FlowPay

## Development Setup

See [GETTING_STARTED.md](./docs/GETTING_STARTED.md) for local development environment setup.

## Code Style

### TypeScript

- Use strict mode
- Avoid `any` types
- Use interfaces for object types
- Use enums for constants

### Formatting

```bash
# Frontend
cd frontend
npm run lint

# Backend
cd backend
npm run lint
```

## Branching Strategy

```
main (production)
├── develop (staging)
│   ├── feature/user-auth
│   ├── feature/drip-scheduler
│   ├── fix/stellar-payment
│   └── docs/api-guide
```

## Commit Messages

```
feat: Add user authentication
fix: Resolve Stellar payment timeout
docs: Update API documentation
style: Format code according to ESLint rules
refactor: Reorganize workflows module
test: Add workflow execution tests
chore: Update dependencies
```

## Testing

### Frontend

```bash
npm run test
```

### Backend

```bash
npm run test
npm run test:cov
```

### End-to-End

```bash
npm run test:e2e
```

## Pull Requests

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

**PR Requirements:**
- Clear description of changes
- Tests added/updated
- Documentation updated
- No breaking changes (unless approved)

## Reporting Bugs

Create an issue with:
1. Clear title
2. Steps to reproduce
3. Expected vs actual behavior
4. Environment details (OS, Node version, etc.)
5. Screenshots/logs if applicable

## Suggesting Features

Create a discussion with:
1. Problem statement
2. Proposed solution
3. Alternative approaches
4. Use cases

---

Made with ❤️ by FlowPay Team
