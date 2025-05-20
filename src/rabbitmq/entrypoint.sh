#!/bin/bash
set -e

# Replace placeholders in rabbitmq.conf with values from secret files
if [ -f "/run/secrets/RABBITMQ_USER" ] && [ -f "/run/secrets/RABBITMQ_PASS" ]; then
  USER=$(cat /run/secrets/RABBITMQ_USER)
  PASS=$(cat /run/secrets/RABBITMQ_PASS)
  sed -i "s|<<RABBITMQ_USER>>|$USER|g" /etc/rabbitmq/rabbitmq.conf
  sed -i "s|<<RABBITMQ_PASSWORD>>|$PASS|g" /etc/rabbitmq/rabbitmq.conf
fi

# Start RabbitMQ
exec /usr/sbin/rabbitmq-server