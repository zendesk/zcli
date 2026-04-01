#!/usr/bin/env bash
# Creates a release PR using Lerna conventional commits
# Publishing happens automatically when PR is merged via GitHub Actions
#
# ┌─────────────────────────────────────────────────────────────────────────┐
# │                        RELEASE PR WORKFLOW                              │
# └─────────────────────────────────────────────────────────────────────────┘
#
#   Developer (master)
#        │
#        ├─ 1. PRE-FLIGHT CHECKS ──────────────────────────────────┐
#        │   • Running in GitHub Actions? (prevent local runs)    │
#        │   • On master branch? (defense if GHA check bypassed)  │
#        │   • Working directory clean? (defense-in-depth)        │
#        │                                                         │
#        ├─ 2. BRANCH CREATION ────────────────────────────────────┤
#        │   • Check if zcli-release exists on remote (error if found) │
#        │   • Create release branch: zcli-release                 │
#        │   • git checkout -b zcli-release                        │
#        │                                                         │
#        ├─ 3. INSTALL & VERSION ──────────────────────────────────┤
#        │   • yarn install --frozen-lockfile                      │
#        │   • Save current version from lerna.json                │
#        │   • lerna version --conventional-commits                │
#        │     ┌─ Analyzes commits since last git tag:            │
#        │     │  - feat: → MINOR bump (1.0.0 → 1.1.0)            │
#        │     │  - fix: → PATCH bump (1.0.0 → 1.0.1)             │
#        │     │  - BREAKING CHANGE: → MAJOR (1.0.0 → 2.0.0)      │
#        │     ├─ For each changed package:                       │
#        │     │  • Updates package.json version                  │
#        │     │  • Generates/updates CHANGELOG.md                │
#        │     └─ Updates lerna.json with new version             │
#        │   • Extract version from lerna.json → NEW_VERSION      │
#        │                                                          │
#        ├─ 4. VERSION CHECK ──────────────────────────────────────┤
#        │   • Compare NEW_VERSION with the current version       │
#        │   • If unchanged:                                      │
#        │     ├─ Show info: "Nothing to release"                 │
#        │     └─ Exit 0 (success, no release needed)             │
#        │   • If changed: Continue to next step                  │
#        │                                                          │
#        ├─ 5. COMMIT ─────────────────────────────────────────────┤
#        │   • git commit -m "chore(release): publish X.X.X"       │
#        │                                                          │
#        └─ 6. PUSH TO GITHUB ─────────────────────────────────────┘
#            • git push origin zcli-release
#
#   Next Steps (Manual):
#   ┌────────────────────────────────────────────────────────────┐
#   │ 1. Create PR: zcli-release → master                        │
#   │ 2. Review changes (version bumps, changelog)               │
#   │ 3. Merge PR                                                 │
#   │    └─> Triggers GitHub Actions: .github/workflows/publish.yml │
#   │        • Detects version change in lerna.json              │
#   │        • Creates git tag                          │
#   │        • Publishes to npm        │
#   └────────────────────────────────────────────────────────────┘
#

set -e

# Ensure this script only runs in GitHub Actions
if [ "$GITHUB_ACTIONS" != "true" ]; then
    echo ""
    echo "❌ Error: This script should only be run via GitHub Actions"
    echo ""
    echo "   Please use the GitHub Actions workflow to create a release:"
    echo "   https://github.com/zendesk/zcli/actions/workflows/create-release-pr.yml"
    echo ""
    exit 1
fi

echo "🚀 ZCLI Release PR Creator"
echo "================================"
echo ""

# Pre-flight checks
if [[ "$(git branch --show-current)" != "master" ]]; then
    printf '❌ Error: Please run this from master branch\n'
    exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
    printf '❌ Error: You have uncommitted changes. Please commit or stash them first.\n'
    exit 1
fi

# Check if release branch already exists on remote
RELEASE_BRANCH="zcli-release"

if git ls-remote --exit-code --heads origin "$RELEASE_BRANCH" >/dev/null 2>&1; then
    echo ''
    echo "❌ Error: Release branch '$RELEASE_BRANCH' already exists on remote."
    echo ''
    echo '   Please close/merge the existing release PR first, then delete the branch.'
    exit 1
fi

echo "🌿 Creating release branch: $RELEASE_BRANCH"
git checkout -b "$RELEASE_BRANCH"

echo '📦 Installing dependencies...'
yarn install --frozen-lockfile

echo ''
echo '📝 Analyzing commits and determining version bump...'
echo '   (using conventional commits since last release)'
echo ''

# Save current version before running lerna
CURRENT_VERSION=$(jq -r '.version' lerna.json)
echo "Current version: $CURRENT_VERSION"
echo ''

# Run lerna version without git operations
# This will:
# - Analyze commits since last tag
# - Determine version bump (major/minor/patch)
# - Update package.json files
# - Update lerna.json
# - Generate CHANGELOG.md files
# Note: We use --no-git-tag-version to prevent tag creation
# Tags will be created when PR is merged to master
npx lerna version \
  --conventional-commits \
  --conventional-graduate \
  --no-git-tag-version \
  --yes

if [ $? -ne 0 ]; then
    echo ''
    echo '❌ Lerna version command failed.'
    echo ''
    echo 'Cleaning up...'
    git checkout master
    git branch -D "$RELEASE_BRANCH" 2>/dev/null || true
    exit 1
fi

# Get the new version
NEW_VERSION=$(jq -r '.version' lerna.json)

# Check if version actually changed
if [ "$NEW_VERSION" = "$CURRENT_VERSION" ]; then
    echo ''
    echo 'ℹ️  No version bump occurred - nothing to release.'
    echo ''
    echo '   No conventional commits found since last release.'
    echo '   Current version: '$CURRENT_VERSION
    echo ''
    echo '✅ No changes to release at this time.'
    exit 0
fi

if [ -z "$NEW_VERSION" ] || [ "$NEW_VERSION" = "null" ]; then
    echo ''
    echo '❌ Could not determine new version.'
    exit 1
fi

# Commit the version changes
echo ''
echo "✅ Version bumped to: $NEW_VERSION"
echo '📝 Committing version changes...'
git add .
git commit -m "chore(release): publish $NEW_VERSION"
echo ''

# Get list of changed packages
echo '📦 Packages to be published:'
npx lerna changed --json 2>/dev/null | jq -r '.[].name' | sed 's/^/   - /'
echo ''

# Push branch only
echo '⬆️  Pushing branch to GitHub...'
git push origin "$RELEASE_BRANCH"

if [ $? -ne 0 ]; then
    echo ''
    echo '❌ Failed to push to GitHub.'
    exit 1
fi

echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo '🎉 Release branch created successfully!'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo ''
echo "📋 Version: $NEW_VERSION"
echo "🌿 Branch:  $RELEASE_BRANCH"
echo ''
echo 'Next steps:'
echo '1. Open a PR: https://github.com/zendesk/zcli/compare/zcli-release?expand=1'
echo '2. Review the version bumps and changelog'
echo '3. Merge the PR to trigger automated publishing'
echo ''
echo '⚠️  Publishing to npm will happen automatically when PR is merged!'
echo '   Git tags will be created automatically by the GitHub Actions workflow.'
echo ''
