#!/usr/bin/env bash

set -e

RELEASE_TYPE="$1"

# if [ "$GITHUB_ACTIONS" != "true" ]; then
#     echo ""
#     echo "Error: This script should only be run via GitHub Actions"
#     echo ""
#     echo "   Please use the GitHub Actions workflow to create a release:"
#     echo "   https://github.com/zendesk/zcli/actions/workflows/create-release-pr.yml"
#     echo ""
#     exit 1
# fi

RELEASE_BRANCH="zcli-release"

if git ls-remote --exit-code --heads origin "$RELEASE_BRANCH" >/dev/null 2>&1; then
    echo ''
    echo "Error: Release branch '$RELEASE_BRANCH' already exists on remote."
    echo ''
    echo 'Please close/merge the existing release PR first, then delete the branch.'
    exit 1
fi

echo "Creating release branch: $RELEASE_BRANCH"
git checkout -b "$RELEASE_BRANCH"

echo 'Installing dependencies...'
yarn install --frozen-lockfile

echo ''
echo 'Analyzing commits and determining version bump...'
echo ''

CURRENT_VERSION=$(jq -r '.version' lerna.json)
echo "Current version: $CURRENT_VERSION"
echo ''

if [ -z "$RELEASE_TYPE" ]; then
  echo "Release type: stable (conventional commits)"
  LERNA_RELEASE_TYPE=""
elif [ "$RELEASE_TYPE" = "prerelease" ]; then
  echo "Release type: prerelease (beta)"
  LERNA_RELEASE_TYPE="--preid beta"
elif [ "$RELEASE_TYPE" = "graduate" ]; then
  echo "Release type: graduate to stable"
  LERNA_RELEASE_TYPE="--conventional-graduate"
else
  echo "Unknown release type: $RELEASE_TYPE"
  exit 1
fi
echo ''

yarn lerna version \
  --conventional-commits \
  ${LERNA_RELEASE_TYPE} \
  --yes \
  --no-push

NEW_VERSION=$(jq -r '.version' lerna.json)
TAG_NAME="v${NEW_VERSION}"

if [ "$NEW_VERSION" = "$CURRENT_VERSION" ]; then
    echo ''
    echo 'No version bump occurred - nothing to release.'
    echo ''
    echo 'No conventional commits found since last release.'
    echo 'Current version: '$CURRENT_VERSION
    exit 0
fi

if [ -z "$NEW_VERSION" ] || [ "$NEW_VERSION" = "null" ]; then
    echo ''
    echo 'Could not determine new version.'
    exit 1
fi

echo ''
echo "Version bumped to: $NEW_VERSION"
echo "Git tag created: $TAG_NAME"
echo ''

echo "Pushing branch and tags to GitHub..."
git push -u origin "$RELEASE_BRANCH" --follow-tags

echo "Branch and tags pushed successfully"
echo ''

echo ''
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo 'Release branch created successfully!'
echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
echo ''
echo "Version: $NEW_VERSION"
echo "Tag:     $TAG_NAME"
echo "Branch:  $RELEASE_BRANCH"
echo ''
echo 'Next steps:'
echo '1. Open a PR: https://github.com/zendesk/zcli/compare/zcli-release?expand=1'
echo '2. Review the version bumps and changelog'
echo '3. Merge the PR to trigger automated publishing'
echo ''
echo 'Publishing to npm will happen automatically when PR is merged!'
echo "Git tag $TAG_NAME will be included with the merge."
echo ''
echo ''
