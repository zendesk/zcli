#!/bin/bash

# exit when any command fails
set -e

echo '🔄 Generate tag, update docs and changelog'
yarn install

# NOTE: Commenting this as we won't be running this script as an action for now
# git config --global user.email "vegemite@zendesk.com"
# git config --global user.name "Github Action"

./scripts/generate_dev_docs.sh
npx lerna version --conventional-commits --yes --message "chore(release): publish %s [ci skip]"
# TODO: Enable publish only when we are about to go live
# npx lerna publish
echo "✅ Done"
exit 0
