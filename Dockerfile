FROM nginx:alpine

# Создаём минимальный ВЕРНЫЙ конфиг
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Копируем файлы сайта
COPY EndSite/public /usr/share/nginx/html

# ОБЯЗАТЕЛЬНО: nginx в контейнере должен оставаться на переднем плане
CMD ["nginx", "-g", "daemon off;"]
