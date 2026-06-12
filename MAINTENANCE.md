# Repository Activity - Maintenance & Improvements

This document tracks the recent maintenance and improvement activities on the FlowPay repository.

## Recent Changes (2026-06-12)

### Deployment Fixes
- ✅ Fixed Netlify deployment errors by updating invalid package versions
- ✅ `@radix-ui/react-slot` updated from `^2.0.0` → `^1.2.5`
- ✅ `soroban-client` updated from `^21.0.0` → `^1.0.0`
- ✅ Regenerated yarn.lock with corrected versions

### Dependency Management Improvements
- ✅ Added missing TypeORM peer dependency to resolve yarn warnings
- ✅ Created `.npmrc` configuration for consistent CI/CD behavior
- ✅ Created `.yarnrc` configuration with workspace support
- ✅ Updated yarn.lock to reflect all dependency changes

### Documentation Enhancements
- ✅ Created CHANGELOG.md following Keep a Changelog format
- ✅ Documented known issues and planned improvements
- ✅ Listed deprecated dependencies and migration paths

## Active Issues Identified

### High Priority
1. **Security**: Update glob packages to fix vulnerabilities
2. **Maintenance**: Replace deprecated soroban-client with @stellar/stellar-sdk

### Medium Priority
1. **Tooling**: Upgrade ESLint from v8 to v9+
2. **Dependencies**: Update transitive dependencies (rimraf, tar, etc.)

### Low Priority
1. **Documentation**: Expand contributor guidelines
2. **Testing**: Improve test coverage

## Commits Created
- `78bd8c2` - docs: add CHANGELOG.md for tracking releases and changes
- `dbe69ed` - chore: add missing TypeORM peer dependency
- `9e103f6` - build: add npm/yarn configuration for consistent environments
- `3eddfad` - deps: update yarn.lock with TypeORM dependency

## Next Steps
1. Address security vulnerabilities in dependency tree
2. Plan migration from deprecated packages
3. Update build toolchain versions
4. Expand test coverage and CI/CD pipeline
