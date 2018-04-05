#!/bin/bash

# Retieves the ID's of keys to add
# Add the relevant parameters as per our solution

# initalises the directory (Refresh environment)
    terraform init

# Validates the plan (Fails quickly in CI/CD)
    terraform validate -var "token=${DO_TOKEN}"

# Refreshs against the real resources (Avoids issues)
    terraform refresh  -var "token=${DO_TOKEN}" -lock=true

# Outputs the plan results to a file (safer)
    terraform plan -var "token=${DO_TOKEN}" -out=terraform.plan -lock=true

# Performs the changes to the infrastructure (Uses the plan)
    terraform apply "terraform.plan"
