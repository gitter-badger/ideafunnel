#!/bin/bash

case "$OSTYPE" in
  darwin*)  echo "darwin-10.6-amd64" ;; 
  linux*)   echo "linux-amd64" ;;
  *)        echo "unknown: $OSTYPE" ;;
esac