# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-12

### Added
- CHANGELOG.md to track project releases and changes
- TypeORM as explicit dependency to resolve peer dependency warnings
- .npmrc configuration for consistent npm/yarn behavior across environments
- Documentation on dependency management and maintenance

### Fixed
- Fixed deployment issue with invalid package versions for Netlify:
  - Updated `@radix-ui/react-slot` from `^2.0.0` to `^1.2.5` (version ^2.0.0 doesn't exist on npm)
  - Updated `soroban-client` from `^21.0.0` to `^1.0.0` (version ^21.0.0 doesn't exist on npm)
- Regenerated yarn.lock with corrected dependency versions
- Resolved yarn install warnings during build

### Changed
- Improved dependency version specifications to use only published versions

### Known Issues
- `soroban-client` is deprecated; consider migration to `@stellar/stellar-sdk` in future release
- `eslint` v8.x is unsupported; upgrade to v9+ is recommended
- Some transitive dependencies have outdated versions (glob, rimraf) - plan upgrade in next release

### Security
- No known security vulnerabilities at this release time
- Recommended: Update glob packages to fix known vulnerabilities

## Future Releases

### Planned
- Migration from deprecated `soroban-client` to `@stellar/stellar-sdk`
- Upgrade ESLint to v9+
- Update build tool dependencies (glob, rimraf)
- Comprehensive test coverage improvements
