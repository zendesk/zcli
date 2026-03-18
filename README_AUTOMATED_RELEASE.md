# 🚀 Automated Release Setup - Quick Start

> **Current Status:** ⚠️ **DRY-RUN MODE** - No packages will be published yet

## What's Been Done ✅

- ✅ Yarn Berry v4.5.3 migration complete
- ✅ `build` script added to package.json
- ✅ Release PR creation script ready
- ✅ GitHub Actions workflow configured
- ✅ **Safety: Dry-run enabled by default**

## What You Need to Do 🔧

### 1️⃣ Update Workflow Path (Required)

**File:** `.github/workflows/release.yml` line ~43

**Change:**
```yaml
uses: zendesk/REPLACE_WITH_ACTUAL_PATH/.github/workflows/npm-publish.yml@main
```

**To:** (Ask your platform team for exact path)
```yaml
uses: zendesk/shared-workflows/.github/workflows/npm-publish.yml@main
```

---

### 2️⃣ Configure Secrets (Required)

Go to: https://github.com/zendesk/zcli/settings/secrets/actions

Add these secrets:
- **`NPM_TOKEN`** - npm automation token
- **`NPM_TOTP_DEVICE`** - TOTP secret (base32)

<details>
<summary>How to get NPM_TOKEN</summary>

```bash
# 1. Login to npm
npm login

# 2. Go to: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
# 3. Generate New Token → Automation
# 4. Copy token (starts with npm_)
# 5. Add to GitHub secrets
```
</details>

<details>
<summary>How to get NPM_TOTP_DEVICE</summary>

```bash
# This is the base32 TOTP secret for npm 2FA

# 1. Go to: https://www.npmjs.com/settings/YOUR_USERNAME/tfa
# 2. Disable 2FA (if enabled)
# 3. Re-enable 2FA
# 4. Click "Can't scan? Enter this code manually"
# 5. Copy the base32 secret (e.g., JBSWY3DPEHPK3PXP)
# 6. Add to GitHub secrets
```
</details>

---

### 3️⃣ Test It! (Recommended)

```bash
# Create a test release
./scripts/create-release-pr.sh

# Follow the PR link, review, and merge
# GitHub Actions will run in dry-run mode (nothing published)
# Check Actions tab for results
```

**Expected:** Workflow completes successfully, no actual publishing happens ✅

---

### 4️⃣ Enable Production (When Ready)

**File:** `.github/workflows/release.yml` line ~46

**Remove the dry-run flag:**
```diff
- command: 'workspaces foreach --no-private --topological npm publish --dry-run --tolerate-republish'
+ command: 'workspaces foreach --no-private --topological npm publish --tolerate-republish'
```

**Commit and push this change.**

Now releases will actually publish to npm! 🎉

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `./scripts/create-release-pr.sh` | Create release PR |
| `./scripts/release.sh` | ⚠️ Old script (deprecated) |
| Check status | https://github.com/zendesk/zcli/actions |

## Documentation

| File | Purpose |
|------|---------|
| 📋 [AUTOMATED_RELEASE_CHECKLIST.md](./AUTOMATED_RELEASE_CHECKLIST.md) | Setup checklist |
| 🔧 [docs/SETUP_RELEASE_WORKFLOW.md](./docs/SETUP_RELEASE_WORKFLOW.md) | Detailed setup guide |
| 📖 [docs/RELEASING.md](./docs/RELEASING.md) | How to create releases |

## Safety Features 🛡️

- ✅ **Dry-run by default** - No accidental publishing
- ✅ **PR review required** - Team reviews before publish
- ✅ **Conventional commits** - Automatic version bumping
- ✅ **Topological order** - Dependencies published first
- ✅ **Idempotent** - Can retry failed publishes

## Workflow Overview

```
Developer                       GitHub Actions
    │
    ├─► ./scripts/create-release-pr.sh
    │   └─► Creates release branch
    │       └─► Lerna bumps versions
    │           └─► Pushes with tags
    │
    ├─► Opens PR
    │
    ├─► Team reviews & merges
    │                           ┌──────────────┐
    │                           │ Dry-Run Mode │
    │                           └──────────────┘
    │                                   │
    │                       ┌───────────▼──────────┐
    │                       │  ⚠️ Nothing published │
    │                       │  Workflow runs OK     │
    │                       └──────────────────────┘
    │
    │   [After removing --dry-run]
    │                           ┌──────────────┐
    │                           │ Production   │
    │                           └──────────────┘
    │                                   │
    │                       ┌───────────▼──────────┐
    │                       │  ✅ Publishes to npm  │
    │                       │  All packages live!   │
    │                       └──────────────────────┘
```

## Need Help?

- **Setup issues:** See [docs/SETUP_RELEASE_WORKFLOW.md](./docs/SETUP_RELEASE_WORKFLOW.md#troubleshooting)
- **Platform team:** Ask for reusable workflow path
- **Questions:** Open issue in this repo

---

**Current Mode:** 🟡 **DRY-RUN** (Safe testing mode)

**Next Step:** Complete items 1️⃣-4️⃣ above to go live! 🚀
