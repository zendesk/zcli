#!/usr/bin/env bash
# Creates a release PR using Lerna conventional commits
# Publishing happens automatically when PR is merged via GitHub Actions

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

# Check for Yarn Berry
YARN_VERSION=$(yarn --version)
if ! echo "$YARN_VERSION" | grep -q "^4"; then
    printf '❌ Error: Yarn Berry (v4) is required. Current version: %s\n' "$YARN_VERSION"
    printf '   Run: yarn set version 4.5.3\n'
    exit 1
fi

echo '🔄 Pulling latest changes from master...'
git pull origin master

echo '🌿 Creating release branch...'
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RELEASE_BRANCH="release/$TIMESTAMP"
git checkout -b "$RELEASE_BRANCH"

echo '📦 Installing dependencies...'
yarn install --immutable

echo ''
echo '📝 Analyzing commits and determining version bump...'
echo '   (using conventional commits since last release)'
echo ''

# Run lerna version without pushing
# This will:
# - Analyze commits since last tag
# - Determine version bump (major/minor/patch)
# - Update package.json files
# - Update lerna.json
# - Create git commit
# - Create git tags
npx lerna version \
  --conventional-commits \
  --no-push \
  --yes \
  --preid 'beta' \
  --message "chore(release): publish %s"

if [ $? -ne 0 ]; then
    echo ''
    echo '❌ Lerna version failed. Cleaning up...'
    git checkout master
    git branch -D "$RELEASE_BRANCH" 2>/dev/null || true
    exit 1
fi

# Get the new version
NEW_VERSION=$(jq -r '.version' lerna.json)

if [ -z "$NEW_VERSION" ] || [ "$NEW_VERSION" = "null" ]; then
    echo ''
    echo '❌ Could not determine new version. Cleaning up...'
    git checkout master
    git branch -D "$RELEASE_BRANCH" 2>/dev/null || true
    exit 1
fi

echo ''
echo "✅ Version bumped to: $NEW_VERSION"
echo ''

# Get list of changed packages
echo '📦 Packages to be published:'
npx lerna changed --json 2>/dev/null | jq -r '.[].name' | sed 's/^/   - /'
echo ''

# Push branch and tags
echo '⬆️  Pushing branch and tags to GitHub...'
git push origin "$RELEASE_BRANCH" --follow-tags

if [ $? -ne 0 ]; then
    echo ''
    echo '❌ Failed to push to GitHub. Please check your permissions.'
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
echo '1. Open a PR: https://github.com/zendesk/zcli/compare/'$RELEASE_BRANCH'?expand=1'
echo '2. Review the version bumps and changelog'
echo '3. Merge the PR to trigger automated publishing'
echo ''
echo '⚠️  Publishing to npm will happen automatically when PR is merged!'
echo ''
