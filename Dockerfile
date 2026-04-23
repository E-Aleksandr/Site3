FROM node:18-alpine

WORKDIR /app

# Копируем package.json (package-lock.json не обязателен)
COPY package*.json ./

# Меняем npm ci на npm install (ci требует lock-файл)
RUN npm install --only=production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
