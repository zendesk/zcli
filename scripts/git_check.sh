#!/bin/bash

delta=$(git status -s | wc -c | awk '{$1=$1};1')
if((delta > 0)); then
    echo "There are uncommited changes."
    exit 1
fi

echo "No uncommited changes."
exit 0