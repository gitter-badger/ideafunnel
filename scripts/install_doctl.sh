#!/bin/bash

# Calculates the variables
    VERSION=$1
    DIR="$(cd "$(dirname "$0")" && pwd)"
    OS=$(${DIR}/get_os_doctl.sh)
    FILE="doctl-${VERSION}-${OS}.tar.gz"
    URL="https://github.com/digitalocean/doctl/releases/download/v${VERSION}/${FILE}"

# Downloads and unzips
    cd /tmp
    wget -q $URL
    tar xf ${FILE}
    sudo mv doctl /usr/bin
