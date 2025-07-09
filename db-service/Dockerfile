FROM node:20-alpine
WORKDIR /app
# Instala Python y build-base para compilar sqlite3
RUN apk add --no-cache python3 build-base
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]
