# Automated Release Setup Checklist

This checklist tracks the setup of the automated release process for ZCLI.

## ✅ Completed Steps

- [x] Migrate to Yarn Berry v4.5.3
- [x] Add `build` script to root package.json
- [x] Create `scripts/create-release-pr.sh`
- [x] Create `.github/workflows/release.yml`
- [x] Update `scripts/release.sh` with deprecation notice
- [x] Create release process documentation

## 🔧 TODO: Configuration Required

### 1. Update Workflow Path (Required)

**File:** `.github/workflows/release.yml`

**Action:** Replace the placeholder with your actual company workflow path

```yaml
# Current (line ~40):
uses: zendesk/REPLACE_WITH_ACTUAL_PATH/.github/workflows/npm-publish.yml@main

# Replace with actual path (ask platform team):
uses: zendesk/shared-workflows/.github/workflows/npm-publish.yml@main
```

**Who to ask:** Platform/DevOps team for the reusable workflow location

---

### 2. Configure GitHub Secrets (Required)

**Location:** Repository Settings → Secrets and variables → Actions

**Secrets to add:**

#### `NPM_TOKEN`
- **What:** npm authentication token
- **How to get:**
  1. Log into npm: https://www.npmjs.com/
  2. Go to: Settings → Access Tokens
  3. Generate New Token → Automation
  4. Copy token (starts with `npm_`)
  5. Add to GitHub secrets

#### `NPM_TOTP_DEVICE`
- **What:** TOTP secret for npm 2FA (base32 encoded)
- **How to get:**
  1. Go to npm 2FA settings
  2. Disable 2FA (if enabled)
  3. Re-enable 2FA
  4. Click "Can't scan? Enter this code manually"
  5. Copy the base32 secret (e.g., `JBSWY3DPEHPK3PXP`)
  6. Add to GitHub secrets
  7. Update your authenticator app with the new secret

**Status:** ⬜ Not configured yet

---

### 3. Test with Dry Run (Recommended)

The workflow is configured with `--dry-run` flag by default for safety.

**Status:** ✅ Already configured (dry-run is the default)

#### Step 3a: Create test release

```bash
# Create test commit with conventional commit message
git checkout -b test-release-workflow
echo "# Test" >> README.md
git add README.md
git commit -m "feat: test automated release workflow"
git push origin test-release-workflow

# Merge to master (or create PR and merge)
# Then run:
./scripts/create-release-pr.sh
```

#### Step 3b: Merge and verify

1. Merge the release PR
2. Go to Actions tab: https://github.com/zendesk/zcli/actions
3. Watch "Release to npm" workflow run
4. Verify it completes without errors
5. Confirm nothing was published to npm (dry-run mode)

**Status:** ⬜ Not tested yet

---

### 4. Enable Production Publishing (Required)

After successful dry-run test, enable real publishing:

**File:** `.github/workflows/release.yml`

**Remove the `--dry-run` flag:**
```yaml
# Change from:
command: 'workspaces foreach --no-private --topological npm publish --dry-run --tolerate-republish'

# To:
command: 'workspaces foreach --no-private --topological npm publish --tolerate-republish'
#                                                        ^^^^^^^^^^^ Remove this
```

**Status:** ⬜ Still in dry-run mode

---

### 5. Update Team Documentation (Optional)

- [ ] Update internal wiki/confluence with new process
- [ ] Notify team about the new release workflow
- [ ] Add link to [docs/RELEASING.md](./docs/RELEASING.md) in onboarding docs

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [docs/SETUP_RELEASE_WORKFLOW.md](./docs/SETUP_RELEASE_WORKFLOW.md) | Detailed setup instructions |
| [docs/RELEASING.md](./docs/RELEASING.md) | How to create releases |
| [scripts/create-release-pr.sh](./scripts/create-release-pr.sh) | Release PR creation script |
| [.github/workflows/release.yml](./.github/workflows/release.yml) | GitHub Actions workflow |

---

## 🚀 Quick Start (After Setup)

Once everything above is configured:

```bash
# 1. Run the release script
./scripts/create-release-pr.sh

# 2. Open the PR URL provided

# 3. Review and merge

# 4. Automated publishing happens!
```

---

## ❓ Getting Help

**Questions about:**
- Reusable workflow path → Ask platform/DevOps team
- npm credentials → Ask maintainer with npm access
- Process/bugs → Open issue in this repo

**Common issues:** See [Troubleshooting section](./docs/SETUP_RELEASE_WORKFLOW.md#troubleshooting) in setup docs

---

## ✅ Ready to Go Live?

Check that all items above are completed:

- [ ] Workflow path updated
- [ ] GitHub secrets configured
- [ ] Dry-run test passed
- [ ] Team notified

Once all checked, you're ready to create your first automated release! 🎉

⚠️ **Remember:** The workflow is in dry-run mode by default. After testing, don't forget to remove the `--dry-run` flag to enable real publishing!
