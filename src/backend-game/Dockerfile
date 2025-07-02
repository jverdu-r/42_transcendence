FROM node:18-alpine

WORKDIR /game_app

COPY package*.json ./

RUN npm install --silent

COPY . .

EXPOSE 8082

CMD ["node", "game_app.js"]