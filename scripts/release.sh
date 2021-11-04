#!/bin/bash

# exit when any command fails
set -e

echo '🔄 Generate tag, update docs and changelog'
yarn install --frozen-lockfile

./scripts/generate_dev_docs.sh

# Investigate why these are generated
git checkout -- docs/apps.md
git checkout -- docs/autocomplete.md
git checkout -- docs/login.md
rm docs/commands.md

# Remove beta once we are out of it
npx lerna publish --conventional-commits --yes --preid 'beta' --no-verify-access --access-public
echo "✅ Done"
exit 0
