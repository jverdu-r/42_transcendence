#!/bin/bash

# Vault Unseal Script
# This script unseals Vault using the keys from initialization

set -e

KEYS_FILE="./vault/generated/vault-keys.json"

if [ ! -f "$KEYS_FILE" ]; then
  echo "Error: vault-keys.json not found!"
  echo "Please run init-vault.sh first or ensure the keys file exists"
  exit 1
fi

echo "=== Unsealing Vault ==="

# Check Vault status
if docker exec hashicorp_vault vault status | grep -q "Sealed.*false"; then
  echo "Vault is already unsealed."
  exit 0
fi

# Extract unseal keys
UNSEAL_KEY_1=$(jq -r '.unseal_keys_b64[0]' "$KEYS_FILE")
UNSEAL_KEY_2=$(jq -r '.unseal_keys_b64[1]' "$KEYS_FILE")

echo "Unsealing with first key..."
docker exec hashicorp_vault vault operator unseal "$UNSEAL_KEY_1"

echo "Unsealing with second key..."
docker exec hashicorp_vault vault operator unseal "$UNSEAL_KEY_2"

if docker exec hashicorp_vault vault status | grep -q "Sealed.*false"; then
  echo "✅ Vault unsealed successfully!"
else
  echo "❌ Failed to unseal Vault"
  exit 1
fi
