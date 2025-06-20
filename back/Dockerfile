# back/Dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --production # Esto está bien para prod, pero si usas dev dependencies, sería npm install
COPY . .
CMD ["node", "src/app.js"]