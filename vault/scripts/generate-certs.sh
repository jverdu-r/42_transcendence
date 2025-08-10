#!/bin/bash

# Generate TLS Certificates for Vault
# This script creates self-signed certificates for development/testing

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/../certs"

echo -e "${BLUE}🔐 Generating TLS Certificates for Vault${NC}"
echo -e "${BLUE}=======================================${NC}"
echo ""

# Create certificates directory
mkdir -p "$CERT_DIR"

# Check if certificates already exist
if [ -f "$CERT_DIR/vault.crt" ] && [ -f "$CERT_DIR/vault.key" ]; then
    echo -e "${YELLOW}⚠️ Certificates already exist in $CERT_DIR${NC}"
    read -p "Do you want to regenerate them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Using existing certificates${NC}"
        exit 0
    fi
fi

echo -e "${BLUE}📋 Certificate configuration:${NC}"
echo "  - Certificate Directory: $CERT_DIR"
echo "  - Certificate Type: Self-signed"
echo "  - Validity: 365 days"
echo "  - Key Size: 2048 bits"
echo ""

# Generate private key
echo -e "${BLUE}🔑 Generating private key...${NC}"
openssl genrsa -out "$CERT_DIR/vault.key" 2048
chmod 644 "$CERT_DIR/vault.key"

# Create certificate configuration
cat > "$CERT_DIR/vault.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=ES
ST=Madrid
L=Madrid
O=Trascender
OU=Development
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = vault
DNS.3 = hashicorp_vault
IP.1 = 127.0.0.1
IP.2 = ::1
EOF

# Generate certificate signing request and certificate
echo -e "${BLUE}📜 Generating certificate...${NC}"
openssl req -new -key "$CERT_DIR/vault.key" -out "$CERT_DIR/vault.csr" -config "$CERT_DIR/vault.conf"
openssl x509 -req -in "$CERT_DIR/vault.csr" -signkey "$CERT_DIR/vault.key" -out "$CERT_DIR/vault.crt" -days 365 -extensions v3_req -extfile "$CERT_DIR/vault.conf"

# Set proper permissions
chmod 644 "$CERT_DIR/vault.crt"
chmod 644 "$CERT_DIR/vault.conf"

# Clean up CSR file
rm "$CERT_DIR/vault.csr"

# Generate CA certificate for client verification (optional)
echo -e "${BLUE}🏛️ Generating CA certificate...${NC}"
openssl genrsa -out "$CERT_DIR/ca.key" 2048
chmod 644 "$CERT_DIR/ca.key"

cat > "$CERT_DIR/ca.conf" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_ca

[dn]
C=ES
ST=Madrid
L=Madrid
O=Trascender
OU=Development CA
CN=Trascender Development CA

[v3_ca]
basicConstraints = critical,CA:TRUE
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
EOF

openssl req -new -x509 -key "$CERT_DIR/ca.key" -out "$CERT_DIR/ca.crt" -days 365 -config "$CERT_DIR/ca.conf"
chmod 644 "$CERT_DIR/ca.crt"
rm "$CERT_DIR/ca.conf"

# Create combined certificate file (cert + CA)
cat "$CERT_DIR/vault.crt" "$CERT_DIR/ca.crt" > "$CERT_DIR/vault-combined.crt"

echo ""
echo -e "${GREEN}✅ Certificates generated successfully!${NC}"
echo -e "${GREEN}=================================${NC}"
echo ""
echo -e "${BLUE}📁 Generated files in $CERT_DIR:${NC}"
echo "  ├── vault.key     - Private key"
echo "  ├── vault.crt     - Server certificate"
echo "  ├── vault.conf    - Certificate configuration"
echo "  ├── ca.key        - CA private key"
echo "  ├── ca.crt        - CA certificate"
echo "  └── vault-combined.crt - Combined certificate"
echo ""
echo -e "${YELLOW}⚠️ Security Notes:${NC}"
echo "  🔐 These are self-signed certificates for development only"
echo "  🔐 Private keys are stored with readable permissions (644)"
echo "  🔐 For production, use certificates from a trusted CA"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "  1. Configure Vault to use TLS with these certificates"
echo "  2. Update client applications to trust the CA certificate"
echo "  3. Use HTTPS URLs (https://localhost:8200)"
echo ""
