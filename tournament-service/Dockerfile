# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json if present
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose port (default 8000)
EXPOSE 8000

# Start the service (replace with your entrypoint if needed)
CMD ["node", "server.js"]
