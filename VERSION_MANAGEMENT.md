# Version Management

Version control and release management strategy.

## Versioning Strategy

### Semantic Versioning (SemVer)

FlowPay follows SemVer: MAJOR.MINOR.PATCH

- **MAJOR**: Breaking API changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

Example: v1.2.3

### Version File

```json
{
  "version": "1.2.3",
  "name": "flowpay",
  "description": "Stellar-powered payment streaming",
  "engines": {
    "node": ">=22.0.0",
    "yarn": ">=1.22.0"
  }
}
```

## Release Process

### Step 1: Prepare Release

```bash
# Update version in package.json
npm version minor  # Automatically bumps version

# Update CHANGELOG.md
# Add new version section with features, fixes, breaking changes
```

### Step 2: Create Release Branch

```bash
# Create release branch
git checkout -b release/v1.2.3

# Commit version bump
git commit -m "chore: bump version to 1.2.3"

# Push branch
git push origin release/v1.2.3
```

### Step 3: Testing

```bash
# Build all packages
yarn build

# Run tests
yarn test

# Run integration tests
yarn test:integration

# Performance testing
yarn test:performance
```

### Step 4: Create GitHub Release

```bash
# Tag release
git tag -a v1.2.3 -m "Release version 1.2.3"

# Push tag
git push origin v1.2.3

# Create release on GitHub
gh release create v1.2.3 \
  --title "Release v1.2.3" \
  --notes-file CHANGELOG.md
```

### Step 5: Publish

```bash
# Publish to npm (if applicable)
npm publish

# Deploy to production
kubectl apply -f k8s/production/
kubectl set image deployment/backend \
  backend=your-registry/flowpay-backend:v1.2.3 \
  -n flowpay-prod

# Verify deployment
kubectl rollout status deployment/backend -n flowpay-prod
```

## CHANGELOG Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2024-01-15

### Added
- GraphQL API support
- Multi-tenancy features
- Webhook implementation

### Changed
- Updated Stellar SDK to v12.0.0
- Improved database query performance
- Enhanced error handling

### Fixed
- Fixed race condition in payment processing
- Corrected timezone handling in schedules
- Resolved memory leak in cache service

### Security
- Added rate limiting to API endpoints
- Implemented request signing for webhooks
- Enhanced JWT token validation

### Deprecated
- Legacy REST API endpoints (use GraphQL)

### Removed
- Support for Node.js < 18
- ESLint v7 (use v8+)

## [1.2.2] - 2024-01-08

### Fixed
- Critical bug in payment confirmation
- Database connection pooling issue

## [1.2.1] - 2024-01-01

### Added
- Performance monitoring dashboard
- Database index optimization

[1.2.3]: https://github.com/flowpay/flowpay/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/flowpay/flowpay/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/flowpay/flowpay/releases/tag/v1.2.1
```

## Git Workflow

### Branch Naming

```
main              # Production branch
├─ develop        # Development branch
   ├─ feature/xxx # Feature branches
   ├─ fix/xxx     # Bug fix branches
   ├─ chore/xxx   # Chore branches
   └─ release/xxx # Release branches
```

### Commit Messages

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`

Example:
```
feat(payments): add GraphQL API for payment creation

Implement GraphQL mutations for creating payments:
- Add Query and Mutation resolvers
- Implement input validation
- Add comprehensive tests

Closes #123
```

## Tag Management

```bash
# List all tags
git tag -l

# Create annotated tag
git tag -a v1.2.3 -m "Release version 1.2.3"

# Push tags
git push origin --tags

# Delete tag
git tag -d v1.2.3
git push origin --delete v1.2.3

# Show tag details
git show v1.2.3
```

## Dependency Updates

### Regular Updates

```bash
# Check for outdated packages
yarn outdated

# Update patch versions
yarn upgrade

# Update minor versions
yarn upgrade --latest

# Interactive upgrade
yarn upgrade-interactive --latest
```

### Security Updates

```bash
# Check for vulnerabilities
yarn audit

# Fix vulnerabilities
yarn audit fix

# Install specific patched version
yarn add react@19.0.1 # if vulnerability found
```

## Version Bump Script

```bash
#!/bin/bash
# scripts/bump-version.sh

set -e

VERSION_TYPE=${1:-patch}  # patch, minor, major

echo "Bumping $VERSION_TYPE version..."

# Update package.json
npm version $VERSION_TYPE --no-git-tag-v

# Get new version
NEW_VERSION=$(cat package.json | grep '"version"' | head -1 | awk -F'"' '{print $4}')

echo "New version: $NEW_VERSION"

# Update CHANGELOG
echo "Update CHANGELOG.md with new version entry"

# Commit and tag
git add .
git commit -m "chore: bump version to $NEW_VERSION"
git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"

echo "Version bumped to $NEW_VERSION"
echo "Run 'git push origin && git push origin --tags' to push changes"
```

## CI/CD Integration

### GitHub Actions Release

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Create Release Notes
        run: |
          VERSION=${GITHUB_REF#refs/tags/}
          echo "Release: $VERSION" > release.md
      
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: build/**
          body_path: release.md
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Deploy to Production
        run: |
          kubectl set image deployment/backend \
            backend=${{ secrets.REGISTRY }}/flowpay-backend:${GITHUB_REF#refs/tags/}
```

## Version Pinning

```json
{
  "dependencies": {
    "react": "19.0.0",           // Exact version
    "stellar-sdk": "^12.0.0",    // Minor updates allowed
    "express": "~4.18.0"         // Patch updates only
  },
  "devDependencies": {
    "typescript": "5.3.0",
    "jest": "^29.0.0"
  }
}
```

## Rolling Back

```bash
# Rollback to previous version
git revert <commit-hash>

# Rollback deployment
kubectl rollout undo deployment/backend -n flowpay-prod

# Check rollout history
kubectl rollout history deployment/backend -n flowpay-prod

# Rollback to specific revision
kubectl rollout undo deployment/backend --to-revision=2 -n flowpay-prod
```

## Best Practices

✅ **Do:**
- Use SemVer
- Update CHANGELOG
- Tag releases
- Test before release
- Document breaking changes
- Automate releases
- Review dependencies
- Keep versions in sync

❌ **Don't:**
- Skip patch versions
- Ignore security updates
- Release without tests
- Use wildcard versions in production
- Commit to main without PR
- Force push to main
- Release without documentation

## Resources

- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)
