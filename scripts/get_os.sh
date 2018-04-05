#!/bin/bash

case "$OSTYPE" in
  solaris*) echo "solaris" ;;
  darwin*)  echo "darwin" ;; 
  linux*)   echo "linux" ;;
  bsd*)     echo "bsd" ;;
  msys*)    echo "windows" ;;
  *)        echo "unknown: $OSTYPE" ;;
esac