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
#        │   • On master branch?                                   │
#        │   • Working directory clean?                            │
#        │                                                          │
#        ├─ 2. SYNC & BRANCH ──────────────────────────────────────┤
#        │   • git pull origin master                              │
#        │   • git checkout -b release/pending-TIMESTAMP           │
#        │                                                          │
#        ├─ 3. INSTALL & VERSION ──────────────────────────────────┤
#        │   • yarn install --frozen-lockfile                      │
#        │   • lerna version --conventional-commits                │
#        │     ┌─ Analyzes commits since last git tag:            │
#        │     │  - feat: → MINOR bump (1.0.0 → 1.1.0)            │
#        │     │  - fix: → PATCH bump (1.0.0 → 1.0.1)             │
#        │     │  - BREAKING CHANGE: → MAJOR (1.0.0 → 2.0.0)      │
#        │     │  - chore/docs/etc → No version change            │
#        │     ├─ For each changed package:                       │
#        │     │  • Updates package.json version                  │
#        │     │  • Generates/updates CHANGELOG.md                │
#        │     └─ Updates lerna.json with new version             │
#        │   • Extract version from lerna.json → NEW_VERSION      │
#        │                                                          │
#        ├─ 4. COMMIT & RENAME ────────────────────────────────────┤
#        │   • git commit -m "chore(release): publish X.X.X"       │
#        │   • git branch -m release/X.X.X                         │
#        │                                                          │
#        ├─ 5. PUSH TO GITHUB ─────────────────────────────────────┤
#        │   • git push origin release/X.X.X                       │
#        │                                                          │
#        └─ 6. SWITCH BACK ────────────────────────────────────────┘
#            • git checkout master
#
#   Next Steps (Manual):
#   ┌────────────────────────────────────────────────────────────┐
#   │ 1. Create PR: release/X.X.X → master                       │
#   │ 2. Review changes (version bumps, changelog)               │
#   │ 3. Merge PR                                                 │
#   │    └─> Triggers GitHub Actions: .github/workflows/publish.yml │
#   │        • Publishes to npm (company service account)        │
#   │        • Creates git tags                                  │
#   └────────────────────────────────────────────────────────────┘
#

set -e

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

echo '🔄 Pulling latest changes from master...'
git pull origin master

echo '🌿 Creating temporary release branch...'
# Create temporary branch - will be renamed after version is determined
TEMP_BRANCH="release/pending-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$TEMP_BRANCH"

echo '📦 Installing dependencies...'
yarn install --frozen-lockfile

echo ''
echo '📝 Analyzing commits and determining version bump...'
echo '   (using conventional commits since last release)'
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
    echo '❌ Lerna version failed. Cleaning up...'
    git checkout master
    git branch -D "$TEMP_BRANCH" 2>/dev/null || true
    exit 1
fi

# Get the new version
NEW_VERSION=$(jq -r '.version' lerna.json)

if [ -z "$NEW_VERSION" ] || [ "$NEW_VERSION" = "null" ]; then
    echo ''
    echo '❌ Could not determine new version. Cleaning up...'
    git checkout master
    git branch -D "$TEMP_BRANCH" 2>/dev/null || true
    exit 1
fi

# Commit the version changes
echo ''
echo "✅ Version bumped to: $NEW_VERSION"
echo '📝 Committing version changes...'
git add .
git commit -m "chore(release): publish $NEW_VERSION"

# Rename branch to use the actual version
RELEASE_BRANCH="release/$NEW_VERSION"
echo "🔄 Renaming branch to: $RELEASE_BRANCH"
git branch -m "$RELEASE_BRANCH"
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

# Switch back to master branch
echo '🔄 Switching back to master branch...'
git checkout master

echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo '🎉 Release branch created successfully!'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo ''
echo "📋 Version: $NEW_VERSION"
echo "🌿 Branch:  $RELEASE_BRANCH"
echo ''
echo 'Next steps:'
echo '1. Open a PR: https://github.com/zendesk/zcli/compare/'$RELEASE_BRANCH'?expand=1'
echo '2. Review the version bumps and changelog'
echo '3. Merge the PR to trigger automated publishing'
echo ''
echo '⚠️  Publishing to npm will happen automatically when PR is merged!'
echo '   Git tags will be created automatically by the GitHub Actions workflow.'
echo ''
