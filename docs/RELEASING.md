# ZCLI Release Process

This document describes the automated release process for ZCLI packages.

> **⚠️ First Time Setup:** Before using this process, complete the one-time setup in [SETUP_RELEASE_WORKFLOW.md](./SETUP_RELEASE_WORKFLOW.md)

## Overview

ZCLI uses an automated two-phase release process:

1. **Phase 1: Version Bump (Local)** - Developer runs a script to create a release PR
2. **Phase 2: Publish (Automated)** - GitHub Actions publishes when the PR is merged

## Prerequisites

Before creating a release, ensure:

- ✅ You have the latest `master` branch
- ✅ You have no uncommitted changes
- ✅ Yarn Berry v4 is installed (`yarn --version` shows 4.x)
- ✅ You have write access to the repository

## Creating a Release

### Step 1: Run the Release Script

```bash
# Make sure you're on master branch
git checkout master
git pull origin master

# Run the release script
./scripts/create-release-pr.sh
```

### Step 2: What the Script Does

The script will:

1. **Analyze commits** since the last release using [Conventional Commits](https://www.conventionalcommits.org/)
2. **Determine version bump**:
   - `feat:` commits → minor version bump (1.0.0 → 1.1.0)
   - `fix:` commits → patch version bump (1.0.0 → 1.0.1)
   - `BREAKING CHANGE:` → major version bump (1.0.0 → 2.0.0)
3. **Update versions** in all package.json files
4. **Update cross-dependencies** (e.g., zcli depends on zcli-apps)
5. **Create git commit** with message: `chore(release): publish 1.0.0-beta.X`
6. **Create git tags** for each package (e.g., `@zendesk/zcli@1.0.0-beta.56`)
7. **Push** the release branch and tags to GitHub

### Step 3: Create Pull Request

After the script completes, it will provide a URL to create a PR:

```
🎉 Release branch created successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Version: 1.0.0-beta.56
🌿 Branch:  release/20260318-140523

Next steps:
1. Open a PR: https://github.com/zendesk/zcli/compare/release/20260318-140523?expand=1
2. Review the version bumps and changelog
3. Merge the PR to trigger automated publishing
```

Click the URL to create the PR.

### Step 4: Review the Release PR

The PR will contain:

- ✅ Version bumps in `lerna.json`
- ✅ Version bumps in all `packages/*/package.json` files
- ✅ Updated cross-package dependencies
- ✅ Git tags (pushed with the branch)

**Review checklist:**

- [ ] Are the version numbers correct?
- [ ] Are all changed packages included?
- [ ] Do the version bumps match the changes? (feat → minor, fix → patch)
- [ ] Are cross-dependencies updated correctly?

### Step 5: Merge the PR

Once approved, merge the PR to `master`.

**This triggers automated publishing!**

## Automated Publishing (Phase 2)

> **⚠️ Safety Note:** The workflow is configured with `--dry-run` by default. Nothing will actually be published until you remove this flag after testing. See [SETUP_RELEASE_WORKFLOW.md](./SETUP_RELEASE_WORKFLOW.md) for details.

When the release PR is merged to `master`, GitHub Actions automatically:

1. **Detects** the release commit (`chore(release): publish`)
2. **Sets up** Node.js 20.17.0 and Yarn Berry
3. **Installs** dependencies
4. **Builds** packages (compiles TypeScript)
5. **Generates** npm 2FA TOTP code
6. **Publishes** all packages to npm in dependency order:
   - `@zendesk/zcli-core`
   - `@zendesk/zcli-apps`
   - `@zendesk/zcli-themes`
   - `@zendesk/zcli-connectors`
   - `@zendesk/zcli`

You can monitor the progress in the [Actions tab](https://github.com/zendesk/zcli/actions).

## Package Publishing Order

Packages are published in **topological order** (dependencies before dependents):

```
1. @zendesk/zcli-core       (no dependencies)
2. @zendesk/zcli-apps       (depends on core)
3. @zendesk/zcli-themes     (depends on core)
4. @zendesk/zcli-connectors (depends on core)
5. @zendesk/zcli            (depends on all above)
```

## Conventional Commits

The release process relies on [Conventional Commits](https://www.conventionalcommits.org/) to determine version bumps.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Common Types

- `feat:` - A new feature (→ **minor** version bump)
- `fix:` - A bug fix (→ **patch** version bump)
- `docs:` - Documentation changes (no version bump)
- `chore:` - Maintenance tasks (no version bump)
- `refactor:` - Code refactoring (no version bump)
- `test:` - Adding or fixing tests (no version bump)

### Breaking Changes

To trigger a **major** version bump, include `BREAKING CHANGE:` in the commit footer:

```
feat: redesign authentication system

BREAKING CHANGE: The auth.login() method now requires a second parameter for 2FA.
```

## Troubleshooting

### Script fails: "Not on master branch"

```bash
git checkout master
```

### Script fails: "Uncommitted changes"

```bash
# Commit or stash your changes
git stash
```

### Script fails: "No commits since last release"

If there are no changes to release, Lerna will exit. This is expected behavior.

### GitHub Actions publish fails

Check the [Actions tab](https://github.com/zendesk/zcli/actions) for error logs.

Common issues:
- **NPM_TOKEN expired** - Update the secret in repository settings
- **NPM_TOTP_DEVICE invalid** - Update the TOTP secret
- **Build failed** - Check TypeScript compilation errors

### Need to rollback a release

1. Revert the release PR merge commit
2. Create a new release with the correct version

**Do NOT unpublish from npm** unless absolutely necessary (breaks user installs).

## GitHub Secrets Required

The following secrets must be configured in the repository:

- `NPM_TOKEN` - npm authentication token with publish access to `@zendesk` scope
- `NPM_TOTP_DEVICE` - TOTP secret for npm 2FA (base32 encoded)

## Testing the Release Process

### Test Version Bump (Safe - No Publishing)

```bash
# Create a test branch
git checkout -b test-release-process

# Run the script
./scripts/create-release-pr.sh

# Verify versions are correct, then cleanup
git checkout master
git branch -D test-release-process
```

### Test GitHub Actions (Dry Run)

Temporarily modify `.github/workflows/release.yml`:

```yaml
# Add --dry-run flag to the publish command
yarn workspaces foreach --no-private --topological npm publish --dry-run --otp $totp
```

This will simulate publishing without actually publishing to npm.

## Comparison: Old vs New Process

| Aspect | Old Process | New Process |
|--------|-------------|-------------|
| **Triggering** | Manual script run | PR merge |
| **Publishing** | Personal npm credentials | Org-level GitHub secrets |
| **Review** | No review | PR review required |
| **Audit trail** | Git log only | PR + GitHub Actions logs |
| **Rollback** | Hard (unpublish) | Easy (revert PR) |
| **Security** | Personal TOTP device | Automated TOTP generation |
| **Compliance** | Non-standard | Uses company workflow pattern |

## FAQ

### Q: Can I still use the old `release.sh` script?

A: Yes, but it's deprecated. It will show a warning and wait 5 seconds before continuing. We recommend switching to the new process.

### Q: What if I need to release just one package?

A: The script releases all changed packages. Lerna automatically detects which packages have changes. If you need fine-grained control, you can manually run:

```bash
npx lerna version --conventional-commits --force-publish=<package-name>
```

### Q: Can I skip the PR review?

A: No. The automated publish only triggers on merged PRs to `master`. This ensures all releases are reviewed.

### Q: What happens if the publish fails midway?

A: The `--tolerate-republish` flag makes the process idempotent. You can re-run the workflow (or manually merge an empty commit) to retry failed packages.

### Q: How do I see what will be included in the release?

A: Run this locally before creating the release:

```bash
npx lerna changed
```

This shows which packages have changed since the last release.

## Additional Resources

- [Lerna Documentation](https://lerna.js.org/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Yarn Berry Documentation](https://yarnpkg.com/)
