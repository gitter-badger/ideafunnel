#!/bin/bash

# Calculates the variables
    PACKAGE=$1
    VERSION=$2
    OS=$(./get_os.sh)
    FILE="${PACKAGE}_${VERSION}_${OS}_amd64.zip"
    URL="https://releases.hashicorp.com/${PACKAGE}/${VERSION}/${FILE}"

# Downloads and unzips
    cd /tmp
    wget -q $URL
    unzip $FILE
    sudo mv $PACKAGE /usr/bin