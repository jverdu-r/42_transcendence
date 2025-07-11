FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.json writer.ts ./

RUN npm install && npm run build

CMD ["node", "dist/writer.js"]
