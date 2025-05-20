FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --silent

COPY . .

EXPOSE 8081

CMD ["node", "app.js"]