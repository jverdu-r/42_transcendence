#!/bin/bash

# Vault Management Script for Trascender Project
# This script provides easy management of Vault operations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_DIR="$SCRIPT_DIR/vault"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_usage() {
    echo "Vault Management Script for Trascender"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  init       - Initialize Vault (first time setup)"
    echo "  unseal     - Unseal Vault using stored keys"
    echo "  seed       - Seed Vault with initial secrets"
    echo "  status     - Check Vault status"
    echo "  tokens     - Show service tokens"
    echo "  renew      - Renew service tokens"
    echo "  backup     - Backup Vault data"
    echo "  restore    - Restore Vault data from backup"
    echo "  ui         - Open Vault UI in browser"
    echo "  logs       - Show Vault logs"
    echo "  help       - Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  VAULT_ADDR - Vault server address (default: http://localhost:8200)"
}

check_vault_container() {
    if ! docker ps | grep -q "hashicorp_vault"; then
        echo -e "${RED}❌ Vault container is not running!${NC}"
        echo "Please start the Vault container first:"
        echo "  docker compose up -d vault"
        exit 1
    fi
}

wait_for_vault() {
    echo -e "${BLUE}⏳ Waiting for Vault to be ready...${NC}"
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        docker exec -e VAULT_ADDR=https://vault:8200 -e VAULT_SKIP_VERIFY=true hashicorp_vault vault status >/dev/null 2>&1
        status_code=$?
        if [ $status_code -eq 0 ] || [ $status_code -eq 2 ]; then
            echo -e "${GREEN}✅ Vault is ready!${NC}"
            return 0
        fi
        sleep 3
        ((attempt++))
    done
    echo -e "${RED}❌ Vault failed to start within expected time${NC}"
    exit 1
}

case "${1:-help}" in
    "init")
        echo -e "${BLUE}🚀 Initializing Vault...${NC}"
        check_vault_container
        wait_for_vault
        
        if docker exec hashicorp_vault test -f /vault/scripts/vault-keys.json; then
            echo -e "${YELLOW}⚠️ Vault is already initialized!${NC}"
            echo "Keys file already exists at /vault/scripts/vault-keys.json"
            exit 0
        fi
        
    docker exec -e VAULT_ADDR=https://vault:8200 -e VAULT_SKIP_VERIFY=true hashicorp_vault /vault/scripts/init-vault.sh
        
        # Copy keys and tokens to host for backup
        docker cp hashicorp_vault:/vault/scripts/vault-keys.json "$VAULT_DIR/scripts/"
        docker cp hashicorp_vault:/vault/scripts/service-tokens.json "$VAULT_DIR/scripts/"
        
        echo -e "${GREEN}✅ Vault initialized successfully!${NC}"
        echo -e "${YELLOW}🔐 IMPORTANT: Backup the following files securely:${NC}"
        echo "  - $VAULT_DIR/scripts/vault-keys.json"
        echo "  - $VAULT_DIR/scripts/service-tokens.json"
        ;;
        
    "unseal")
        echo -e "${BLUE}🔓 Unsealing Vault...${NC}"
        check_vault_container
        
        if ! docker exec hashicorp_vault test -f /vault/scripts/vault-keys.json; then
            echo -e "${RED}❌ Vault keys not found!${NC}"
            echo "Please run 'init' command first or ensure vault-keys.json exists"
            exit 1
        fi
        
    docker exec -e VAULT_ADDR=https://vault:8200 -e VAULT_SKIP_VERIFY=true hashicorp_vault /vault/scripts/unseal-vault.sh
        ;;
        
    "seed")
        echo -e "${BLUE}🌱 Seeding Vault with secrets...${NC}"
        check_vault_container
        
        if ! docker exec hashicorp_vault test -f /vault/scripts/service-tokens.json; then
            echo -e "${RED}❌ Service tokens not found!${NC}"
            echo "Please run 'init' command first"
            exit 1
        fi
        
        ROOT_TOKEN=$(docker exec hashicorp_vault jq -r '.root_token' /vault/scripts/service-tokens.json)
        docker exec -e VAULT_ADDR=http://localhost:8200 -e VAULT_TOKEN="$ROOT_TOKEN" \
            hashicorp_vault /vault/scripts/seed-secrets.sh
        
        # Copy generated .env file to project root
        if docker exec hashicorp_vault test -f /vault/scripts/.env.vault; then
            docker cp hashicorp_vault:/vault/scripts/.env.vault "$SCRIPT_DIR/.env.generated"
            echo -e "${GREEN}📄 Environment file copied to .env.generated${NC}"
            echo "Review and rename to .env to use"
        fi
        ;;
        
    "status")
        echo -e "${BLUE}📊 Checking Vault status...${NC}"
        check_vault_container
        
        echo "Container Status:"
        docker ps | grep hashicorp_vault || echo "Vault container not found"
        echo ""
        
        echo "Vault Status:"
        docker exec hashicorp_vault vault status || true
        ;;
        
    "tokens")
        echo -e "${BLUE}🔑 Service Tokens:${NC}"
        check_vault_container
        
        if docker exec hashicorp_vault test -f /vault/scripts/service-tokens.json; then
            echo "Available tokens:"
            docker exec hashicorp_vault jq -r 'keys[]' /vault/scripts/service-tokens.json
        else
            echo -e "${RED}❌ Service tokens file not found${NC}"
        fi
        ;;
        
    "renew")
        echo -e "${BLUE}🔄 Renewing service tokens...${NC}"
        check_vault_container
        
        docker exec -e VAULT_ADDR=http://localhost:8200 hashicorp_vault /vault/scripts/renew-tokens.sh
        ;;
        
    "backup")
        echo -e "${BLUE}💾 Creating Vault backup...${NC}"
        BACKUP_DIR="$SCRIPT_DIR/backups/vault-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "$BACKUP_DIR"
        
        # Backup configuration and scripts
        cp -r "$VAULT_DIR" "$BACKUP_DIR/"
        
        # Backup Vault data if container is running
        if docker ps | grep -q "hashicorp_vault.*Up"; then
            docker exec hashicorp_vault tar czf /tmp/vault-data.tar.gz -C /vault/file .
            docker cp hashicorp_vault:/tmp/vault-data.tar.gz "$BACKUP_DIR/"
        fi
        
        echo -e "${GREEN}✅ Backup created at: $BACKUP_DIR${NC}"
        ;;
        
    "restore")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please specify backup directory${NC}"
            echo "Usage: $0 restore <backup-directory>"
            exit 1
        fi
        
        BACKUP_PATH="$2"
        if [ ! -d "$BACKUP_PATH" ]; then
            echo -e "${RED}❌ Backup directory not found: $BACKUP_PATH${NC}"
            exit 1
        fi
        
        echo -e "${YELLOW}⚠️ This will restore Vault from backup. Continue? (y/N)${NC}"
        read -r confirm
        if [[ ! $confirm =~ ^[Yy]$ ]]; then
            echo "Restore cancelled"
            exit 0
        fi
        
        echo -e "${BLUE}📥 Restoring Vault from backup...${NC}"
        
        # Stop Vault container
        docker compose stop vault
        
        # Restore configuration
        cp -r "$BACKUP_PATH/vault"/* "$VAULT_DIR/"
        
        # Start Vault container
        docker compose up -d vault
        wait_for_vault
        
        # Restore data if backup exists
        if [ -f "$BACKUP_PATH/vault-data.tar.gz" ]; then
            docker cp "$BACKUP_PATH/vault-data.tar.gz" hashicorp_vault:/tmp/
            docker exec hashicorp_vault tar xzf /tmp/vault-data.tar.gz -C /vault/file/
        fi
        
        echo -e "${GREEN}✅ Vault restored successfully${NC}"
        ;;
        
    "ui")
        echo -e "${BLUE}🌐 Opening Vault UI...${NC}"
        VAULT_ADDR=${VAULT_ADDR:-http://localhost:8200}
        echo "Opening $VAULT_ADDR/ui"
        
        # Try to open browser (works on most Linux distros and macOS)
        if command -v xdg-open >/dev/null; then
            xdg-open "$VAULT_ADDR/ui"
        elif command -v open >/dev/null; then
            open "$VAULT_ADDR/ui"
        else
            echo "Please open $VAULT_ADDR/ui in your browser"
        fi
        ;;
        
    "logs")
        echo -e "${BLUE}📋 Vault logs:${NC}"
        docker logs hashicorp_vault --tail=50 -f
        ;;
        
    "help"|*)
        print_usage
        ;;
esac
