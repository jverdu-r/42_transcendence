FROM node:18-alpine

WORKDIR /db_access_app

COPY package*.json ./

RUN npm install --silent

COPY . .

EXPOSE 8080

CMD ["node", "db_access_app.js"]
