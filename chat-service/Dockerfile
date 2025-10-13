FROM node:20-alpine
WORKDIR /app

# Instalar dependencias del sistema para SQLite
RUN apk add --no-cache python3 make g++ sqlite-dev

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 8000
CMD ["npm", "start"]
