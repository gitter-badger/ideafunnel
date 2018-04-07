#!/bin/bash

BRANCH=$(git rev-parse --short HEAD)
SSH_KEY=/tmp/id_rsa
SSH_KEY_NAME=${BRANCH}

#DO_VARS="-var token=${DO_TOKEN}
DO_VARS="-var token=${DO_TOKEN}
         -var uid=${BRANCH}
         -var region=lon1
         -var droplet_count=1
         -var loadbalancer_count=1
         -var whoami=$(whoami)
         -var key_name=${SSH_KEY_NAME}
         -var prv_key=${SSH_KEY}
         -var pub_key=${SSH_KEY}.pub"

# Generates a new ssh key
rm -f ${SSH_KEY} && ssh-keygen -t rsa -f ${SSH_KEY} -N ""

# Ensures the script is run in its current directory
cd $(dirname "$0")

# Initalises the directory
terraform init

# Validates the plan (fails faster in CI/CD)
terraform validate ${DO_VARS}

# Refreshs against the real resources
terraform refresh ${DO_VARS} -lock=true

# Outputs the plan results to a file (safer than apply)
terraform plan ${DO_VARS} -out=terraform.plan -lock=true

# Performs the changes to the infrastructure using the plan
terraform apply terraform.plan