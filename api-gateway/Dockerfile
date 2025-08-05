FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install fastify
RUN npm install --save-dev @types/node
RUN npm install node-fetch
RUN npm install --save-dev @types/node-fetch @types/node
COPY . .
RUN npm run build
EXPOSE 8000
CMD ["npm", "start"]
