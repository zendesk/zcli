# Use Ubuntu 22.04 LTS as base image
FROM ubuntu:22.04

# Install dependencies required for adding repositories
RUN apt-get update && apt-get install -y curl gnupg2 ca-certificates lsb-release
# Install required dependencies
RUN apt-get update && apt-get install -y npm dbus-x11 libsecret-1-dev gnome-keyring

# Make sure ca-certificates is installed
RUN apt-get install -y ca-certificates

# Install nvm, Node.js
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 18

# Use bash shell for the install script
SHELL ["/bin/bash", "-c"]

# Install nvm (Note: the version might need updating)
RUN mkdir -p $NVM_DIR && curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

# Install Node.js 18 and set it as the default
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

# Add nvm.sh to .bashrc for future login shells
RUN echo 'export NVM_DIR="$NVM_DIR"' >> /etc/bash.bashrc \
    && echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> /etc/bash.bashrc

# Add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN npm install @zendesk/zcli -g

# For headless Linux:
RUN echo 'export $(dbus-launch)' >> /etc/bash.bashrc
# Init kerying storage by creating a default file
RUN echo 'echo "123456" | gnome-keyring-daemon  -r --unlock --components=secrets' >> /etc/bash.bashrc


# # Set the work directory
WORKDIR /app

# Command to run when starting the container
CMD [ "bash" ]
