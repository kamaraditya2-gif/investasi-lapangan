FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

ENV PORT=3000
ENV JWT_SECRET=dsc-investasi-jwt-secret-2026

EXPOSE 3000

CMD ["node", "server.js"]
