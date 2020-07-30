#!/bin/bash

# exit when any command fails
set -e

echo '🔄 Generate tag, update docs and changelog'
yarn install

./scripts/generate_dev_docs.sh

# Remove beta once we are out of it
npx lerna publish --conventional-commits --yes --preid 'beta'
echo "✅ Done"
exit 0
