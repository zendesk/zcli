# Setting Up the Automated Release Workflow

This guide explains how to configure the automated release workflow to use your company's reusable npm publish workflow.

## Prerequisites

Before setting up the workflow, you need:

1. **Company Reusable Workflow Location**
   - Ask your platform team for the exact path
   - Example: `zendesk/shared-workflows/.github/workflows/npm-publish.yml@main`

2. **GitHub Secrets** (configured in repository settings)
   - `NPM_TOKEN` - npm authentication token with publish access to `@zendesk` scope
   - `NPM_TOTP_DEVICE` - TOTP secret for npm 2FA (base32 encoded)

3. **GitHub Environment** (optional, for additional protection)
   - Create an environment named `npm-publish` in repository settings
   - Add reviewers if you want manual approval before publishing

## Configuration Steps

### Step 1: Update the Workflow Path

Edit `.github/workflows/release.yml` and replace the placeholder:

```yaml
publish:
  uses: zendesk/REPLACE_WITH_ACTUAL_PATH/.github/workflows/npm-publish.yml@main
```

With the actual path to your company's reusable workflow:

```yaml
publish:
  # Example - replace with your actual path
  uses: zendesk/shared-workflows/.github/workflows/npm-publish.yml@main
```

### Step 2: Verify the Command Input

The workflow passes this command to the reusable workflow:

```yaml
with:
  node_version: '20.17.0'
  command: 'workspaces foreach --no-private --topological npm publish --tolerate-republish'
  commit: false
```

**How this works:**

The company workflow executes:
```bash
yarn ${{ inputs.command }} --otp $totp
```

Which becomes:
```bash
yarn workspaces foreach --no-private --topological npm publish --tolerate-republish --otp $totp
```

**Command breakdown:**
- `workspaces foreach` - Iterate over all workspace packages
- `--no-private` - Skip packages marked as `"private": true`
- `--topological` - Publish in dependency order (zcli-core → zcli-apps → zcli)
- `npm publish` - Yarn Berry's command to publish to npm
- `--tolerate-republish` - Don't fail if version already exists (idempotent)
- `--otp $totp` - 2FA token (appended by reusable workflow)

### Step 3: Configure GitHub Secrets

**To add secrets:**

1. Go to: `https://github.com/zendesk/zcli/settings/secrets/actions`
2. Click "New repository secret"
3. Add the following secrets:

#### NPM_TOKEN

1. Log into npm: `npm login`
2. Create a token: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
3. Select "Automation" token type
4. Copy the token (starts with `npm_`)
5. Add as `NPM_TOKEN` in GitHub secrets

#### NPM_TOTP_DEVICE

This is the base32-encoded TOTP secret for npm 2FA.

**To get this:**

1. Go to npm 2FA settings: https://www.npmjs.com/settings/YOUR_USERNAME/tfa
2. When setting up 2FA, npm shows a QR code
3. Click "Can't scan? Enter this code manually"
4. Copy the base32 secret (format: `JBSWY3DPEHPK3PXP`)
5. Add as `NPM_TOTP_DEVICE` in GitHub secrets

**Important:** If you're already using 2FA with an authenticator app, you'll need to:
- Disable 2FA on npm
- Re-enable it and save the new secret
- Update your authenticator app with the new secret

### Step 4: Test the Workflow

Before going live, test with a dry run:

1. **Modify the workflow temporarily:**
   ```yaml
   command: 'workspaces foreach --no-private --topological npm publish --dry-run --tolerate-republish'
   #                                                                    ^^^^^^^^^ Add this
   ```

2. **Create a test release PR:**
   ```bash
   # Add a test commit
   git checkout -b test-workflow
   echo "# Test" >> README.md
   git add README.md
   git commit -m "feat: test automated release"
   git push origin test-workflow

   # Merge to master, then create release
   ./scripts/create-release-pr.sh
   ```

3. **Merge the release PR**

4. **Check GitHub Actions:**
   - Go to: https://github.com/zendesk/zcli/actions
   - Find the "Release to npm" workflow run
   - Verify it completes successfully
   - Check that `--dry-run` prevented actual publishing

5. **Remove `--dry-run` when ready for production**

## Workflow Flow

```
Developer                          GitHub Actions
    │                                    │
    ├─> ./scripts/create-release-pr.sh  │
    │   └─> Creates release branch      │
    │       └─> Pushes with tags        │
    │                                    │
    ├─> Opens PR                         │
    │                                    │
    ├─> Team reviews & merges           │
    │                                    │
    │                           Triggers │
    │                                    │
    │                      check-release │
    │                      └─> Detects   │
    │                          "chore(   │
    │                          release)" │
    │                                    │
    │                          publish   │
    │                      └─> Calls     │
    │                          Company   │
    │                          Workflow  │
    │                          │         │
    │                          ├─ Setup │
    │                          ├─ Install│
    │                          ├─ Build  │
    │                          ├─ TOTP   │
    │                          └─ Publish│
    │                                    │
    │                          Success!  │
    ├─<─────────────────────────────────┤
    │   All packages on npm!             │
```

## Verifying Company Workflow Compatibility

Your company's reusable workflow should:

✅ Accept `node_version` input (we use `'20.17.0'`)
✅ Accept `command` input (we pass workspace publishing command)
✅ Accept `commit` input (we set to `false`)
✅ Require `NPM_TOKEN` secret
✅ Require `NPM_TOTP_DEVICE` secret
✅ Run `yarn install --immutable`
✅ Run `yarn build` (we added this script)
✅ Execute `yarn ${{ inputs.command }} --otp $totp`
✅ Cleanup `.yarnrc.yml` afterward

If your workflow is different, you may need to:
- Adjust the inputs
- Add additional secrets
- Modify the `build` script in `package.json`

## Troubleshooting

### Error: "Reusable workflow not found"

**Problem:** The workflow path is incorrect or you don't have access.

**Solution:**
- Verify the exact path with your platform team
- Check that the workflow is in a public repo or you have access
- Ensure the `@main` or `@v1` branch/tag exists

### Error: "Required secret NPM_TOKEN not provided"

**Problem:** Secrets are not configured in repository settings.

**Solution:**
- Add both `NPM_TOKEN` and `NPM_TOTP_DEVICE` to repository secrets
- Ensure secrets are available to the environment if using one

### Error: "yarn build: command not found"

**Problem:** The `build` script is missing from root `package.json`.

**Solution:**
- Verify `package.json` has:
  ```json
  "scripts": {
    "build": "yarn workspaces foreach --topological --no-private run prepack"
  }
  ```

### Error: "npm publish failed with 401 Unauthorized"

**Problem:** NPM_TOKEN is invalid or expired.

**Solution:**
- Generate a new npm token
- Update the `NPM_TOKEN` secret in GitHub

### Error: "npm publish failed with 'one-time pass' error"

**Problem:** TOTP code is invalid.

**Solution:**
- Verify `NPM_TOTP_DEVICE` secret is the correct base32 secret
- Re-setup npm 2FA if needed and update the secret

### Packages published in wrong order

**Problem:** Dependencies published after dependents.

**Solution:**
- Ensure `--topological` flag is in the command
- Check that `packages/*/package.json` have correct dependencies

## Advanced Configuration

### Using a GitHub Environment for Protection

Add an environment to require manual approval before publishing:

1. **Create environment:**
   - Go to: Repository Settings → Environments
   - Click "New environment"
   - Name it: `npm-publish`

2. **Add protection rules:**
   - Required reviewers: Add team members
   - Wait timer: Optional delay before publishing

3. **Update workflow (already configured):**
   ```yaml
   publish:
     environment: npm-publish  # ← Already in the workflow
   ```

### Custom Post-Publish Actions

To add actions after publishing, create a new job:

```yaml
post-publish:
  needs: publish
  if: success()
  runs-on: ubuntu-latest
  steps:
    - name: Notify Slack
      run: |
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -d '{"text":"🎉 ZCLI ${{ needs.check-release.outputs.version }} published!"}'
```

### Publishing to Different Registries

To publish to a private registry (e.g., for testing):

```yaml
command: 'config set npmRegistryServer https://npm-test.zendesk.com && workspaces foreach npm publish'
```

## Getting Help

If you encounter issues:

1. **Check the workflow logs** in GitHub Actions
2. **Ask your platform team** about the reusable workflow
3. **Review company documentation** for npm publishing standards
4. **Open an issue** in the ZCLI repository with:
   - Workflow run URL
   - Error message
   - Steps to reproduce

## Reference: Required Scripts

Ensure your root `package.json` has these scripts:

```json
{
  "scripts": {
    "build": "yarn workspaces foreach --topological --no-private run prepack",
    "postinstall": "echo 'Workspaces installed'"
  }
}
```

Each workspace package should have:

```json
{
  "scripts": {
    "prepack": "tsc && ../../scripts/prepack.sh",
    "postpack": "rm -f oclif.manifest.json npm-shrinkwrap.json && rm -rf ./dist && git checkout ./package.json"
  }
}
```
