FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /auth_app

COPY package*.json ./

RUN npm install --silent

COPY . .

EXPOSE 8081

CMD ["node", "auth_app.js"]
