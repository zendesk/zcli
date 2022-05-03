#!/bin/bash

# git_check determines whether there are any uncommitted changes
# the key purpose of this check is to run after `yarn install` in the test GA workflow
# so as to confirm that `yarn install` does not cause a delta in any of the lock files

delta=$(git status -s | wc -c | awk '{$1=$1};1')
if((delta > 0)); then
    echo "There are uncommited changes."
    exit 1
fi

echo "No uncommited changes."
exit 0
