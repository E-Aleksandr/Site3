# Используем официальный образ Node.js
FROM node:18-alpine

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Создаем директорию для БД и даем права
RUN mkdir -p /app/data && chmod 777 /app/data

# Объявляем том для персистентности БД
VOLUME ["/app/data"]

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server.js"]
