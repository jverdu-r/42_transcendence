FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /game_app

COPY package*.json ./

RUN npm install --silent

COPY . .

EXPOSE 8082
EXPOSE 3000

CMD ["node", "game_app.js"]
