FROM node:20-alpine

# Install necessary packages
RUN apk add --no-cache bash python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install && npm install node-fetch

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "start"]
