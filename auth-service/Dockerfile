FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /app/data && chmod 777 /app/data
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]
