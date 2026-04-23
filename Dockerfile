FROM nginx:alpine

# Удаляем стандартную страницу
RUN rm -rf /usr/share/nginx/html/*

# Копируем ТВОЮ папку public
COPY public /usr/share/nginx/html

# Говорим nginx, что главный файл — admin.html
RUN echo 'server { \
    listen 8080; \
    root /usr/share/nginx/html; \
    index admin.html; \
    location / { \
        try_files $uri $uri/ /admin.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
