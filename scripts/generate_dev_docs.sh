#!/bin/bash

# exit when any command fails
set -e

echo '🔄 Updating dev docs for all packages'

dirname="zcli"
readme="./packages/$dirname/README.md"

cd "./packages/$dirname/"
echo "Generating docs for $dirname"
npx oclif readme --dir ../../docs --multi
echo "✅ Done"
cd ../..

git add packages/**/*.md
changed_files_count=$(git diff --cached --numstat | wc -l | xargs)
echo "Detected $changed_files_count file changes"
git commit -m "Generate docs"

exit 0
