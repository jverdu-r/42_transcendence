FROM node:20-alpine

RUN apk add --no-cache bash python3 make g++

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 8002

CMD ["npm", "run", "dev"]
