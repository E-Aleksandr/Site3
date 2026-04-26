FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
RUN npm install @libsql/client
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
