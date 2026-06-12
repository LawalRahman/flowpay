# Contributing to FlowPay

Thank you for your interest in contributing to FlowPay! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites
- Node.js 22.x or higher
- Yarn 1.22.x or higher
- Git

### Development Setup
See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

### Clone the Repository
```bash
git clone https://github.com/bimbsdev/flowpay.git
cd flowpay-stellar
```

## Making Changes

### Branch Naming Convention
- `feature/` - New features (e.g., `feature/add-streaming-payments`)
- `fix/` - Bug fixes (e.g., `fix/payment-validation`)
- `chore/` - Maintenance tasks (e.g., `chore/update-dependencies`)
- `docs/` - Documentation updates (e.g., `docs/api-guide`)

### Commit Message Format

Follow the Conventional Commits specification:

```
type(scope): subject

body

footer
```

#### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, etc.)
- **refactor**: Code change that neither fixes nor adds features
- **perf**: Code change that improves performance
- **test**: Adding or updating tests
- **chore**: Changes to build process, dependencies, etc.

#### Examples
```bash
git commit -m "feat(payments): add streaming payment support

- Implement payment stream API endpoint
- Add duration and frequency parameters
- Include rate limiting"

git commit -m "fix(auth): resolve JWT expiration bug

Fixes #123"

git commit -m "chore(deps): update stellar-sdk to latest version"
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear, descriptive commits
3. Add or update tests for your changes
4. Update documentation as needed
5. Push to your fork
6. Create a Pull Request with a clear description

#### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issues
Fixes #123

## Testing
Describe testing approach

## Checklist
- [ ] Tested locally
- [ ] Updated documentation
- [ ] Added tests (if applicable)
- [ ] No new warnings/errors
```

## Testing

### Run Tests
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:cov

# Run e2e tests
yarn test:e2e
```

### Frontend Testing
```bash
cd frontend
yarn test
```

### Backend Testing
```bash
cd backend
yarn test
```

## Linting and Formatting

```bash
# Lint all code
yarn lint

# Format code
yarn format

# Check types
yarn type-check
```

## Building

```bash
# Build entire project
yarn build

# Build frontend only
cd frontend && yarn build

# Build backend only
cd backend && yarn build
```

## Documentation

- Update relevant documentation files when making changes
- Follow Markdown best practices
- Include code examples where helpful
- Keep documentation up-to-date with code changes

## Reporting Issues

When reporting bugs, include:
- Clear, descriptive title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, OS, etc.)
- Error messages and logs

## Feature Requests

When requesting features, include:
- Use case and motivation
- Proposed solution
- Alternative approaches considered
- Example usage

## Questions?

- Check existing issues and documentation
- Open a discussion for questions
- Reach out to maintainers

## Recognition

Contributors will be recognized in:
- Commit history
- Release notes
- Contributors list

Thank you for contributing! 🚀
