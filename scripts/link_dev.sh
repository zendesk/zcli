#!/usr/bin/env bash

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
JAVASCRIPT_ENTRYPOINT_PATH="$DIR/../packages/zcli/bin/run"
if [[ "$OSTYPE" == "cygwin" ]]; then
    # Cygwin relies on foreign Node.js installations, which recognise Windows paths
    # shellcheck disable=1003
    JAVASCRIPT_ENTRYPOINT_PATH="$(cygpath -wa "$JAVASCRIPT_ENTRYPOINT_PATH" | tr '\\' '/')"
fi

# link zcli-core & zcli-apps into ./packages/zcli/node_modules/@zendesk/
npx lerna link

# determine where we should install the stub to
YARN_GLOBAL_BIN_DIR="$(yarn global bin)"
TYPESCRIPT_ENTRYPOINT_PATH="$YARN_GLOBAL_BIN_DIR/zcli"
mkdir -p "$YARN_GLOBAL_BIN_DIR"

printf '\n\nSetting up %s with contents below for ZCLI development\n\n' "$TYPESCRIPT_ENTRYPOINT_PATH"
touch "$TYPESCRIPT_ENTRYPOINT_PATH"
chmod +x "$TYPESCRIPT_ENTRYPOINT_PATH"
tee "$TYPESCRIPT_ENTRYPOINT_PATH" <<EOF
#!/usr/bin/env bash
ts-node "$JAVASCRIPT_ENTRYPOINT_PATH" "\$@"
EOF

TYPESCRIPT_ENTRYPOINT_GLOBAL_PATH='/usr/local/bin/zcli'
if [[ "$TYPESCRIPT_ENTRYPOINT_PATH" != "/usr"* ]] && [[ -d '/usr/local/bin' ]] &&
    [[ ! -f "$TYPESCRIPT_ENTRYPOINT_GLOBAL_PATH" ]] && [[ "$OSTYPE" == "darwin"* ]]; then
    printf '\n'
    read -r -n1 -p "Do you also want to set up $TYPESCRIPT_ENTRYPOINT_GLOBAL_PATH for global use? [y/n] "
    printf '\n'
    if [[ "$REPLY" == 'y' ]]; then
        ln -s "$TYPESCRIPT_ENTRYPOINT_PATH" "$TYPESCRIPT_ENTRYPOINT_GLOBAL_PATH"
    fi
fi

printf '\n\n'
printf 'Done! If you are using a version manager, you may also want to reshim\n'
printf 'For example, \e]8;;https://asdf-vm.com\e\\asdf\e]8;;\e\\ reshim nodejs\n'
