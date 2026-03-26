#!/usr/bin/env bash

# ┌───────────────────────────────────────────────────────────────────────┐
# │                           ⚠️  DEPRECATED                              │
# ├───────────────────────────────────────────────────────────────────────┤
# │ This script is deprecated and will be removed in a future release.   │
# │                                                                       │
# │ Please use the new Release PR workflow instead:                      │
# │   1. Run: ./scripts/create-release-pr.sh                             │
# │   2. Review and merge the generated PR                               │
# │   3. Publishing happens automatically                                 │
# │                                                                       │
# │ See the "Releasing" section in README.md for detailed instructions.  │
# └───────────────────────────────────────────────────────────────────────┘

echo ""
echo "⚠️  WARNING: This script is deprecated!"
echo ""
echo "Please use the new Release PR workflow:"
echo "  $ ./scripts/create-release-pr.sh"
echo ""
echo "See README.md (Releasing section) for more details."
echo ""
exit 1

if [[ "$(yarn config get @zendesk:registry)" == *'jfrog'* ]]; then
    # https://github.com/yarnpkg/yarn/issues/5310
    printf 'Please remove Artifactory configurations from ~/.npmrc first\n'
    exit 1
fi

if ! npm whoami &> /dev/null; then
  printf 'Please make sure you are logged into NPM\n'
  exit 1
fi

if [[ "$(git branch --show-current)" != "master" ]]; then
    printf 'Your are not on master branch at the moment. Really continue? [y/n] '
    read -n1 -r; printf '\n'
    if [[ "$REPLY" != 'y' ]]; then
        printf 'Aborted\n'
        exit 0
    fi
fi

echo '🔄 Generate tag, update docs and changelog'
yarn install

# TODO: move custom docs part of app.md etc to another place,
# so we can continue to run generate_dev_docs.sh script
# ./scripts/generate_dev_docs.sh

# Remove beta once we are out of it
npx lerna publish --conventional-commits --yes --preid 'beta'
echo "✅ Done"
exit 0
