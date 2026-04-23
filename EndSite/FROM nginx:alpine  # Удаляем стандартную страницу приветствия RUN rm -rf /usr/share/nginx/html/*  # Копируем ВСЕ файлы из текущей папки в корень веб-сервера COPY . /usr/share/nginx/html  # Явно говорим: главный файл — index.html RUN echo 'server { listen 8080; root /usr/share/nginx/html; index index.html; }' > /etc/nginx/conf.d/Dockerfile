FROM nginx:alpine

# Удаляем стандартную страницу приветствия
RUN rm -rf /usr/share/nginx/html/*

# Копируем ВСЕ файлы из текущей папки в корень веб-сервера
COPY . /usr/share/nginx/html

# Явно говорим: главный файл — index.html
RUN echo 'server { listen 8080; root /usr/share/nginx/html; index index.html; }' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
