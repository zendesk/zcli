#!/bin/bash

CURR_DIR=$PWD
PKR_NAME=$(basename "$PWD")
echo '['$PKR_NAME'] Updating package.json '

# Update main and oclif.commands key to dist directory
jq '.main = "dist/index.js"' $CURR_DIR/package.json > $CURR_DIR/package-tmp.json && mv $CURR_DIR/package-tmp.json $CURR_DIR/package.json
jq '.oclif.commands = "./dist/commands"' $CURR_DIR/package.json > $CURR_DIR/package-tmp.json && mv $CURR_DIR/package-tmp.json $CURR_DIR/package.json
