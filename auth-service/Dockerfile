FROM node:20-alpine
WORKDIR /app
RUN mkdir -p /app/data && chmod 777 /app/data
COPY package*.json ./
RUN npm install
RUN npm install @fastify/multipart && npm install --save-dev @types/node
RUN npm install sharp
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]
