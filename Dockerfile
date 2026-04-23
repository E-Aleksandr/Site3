FROM nginx:alpine
COPY EndSite/public /usr/share/nginx/html
EXPOSE 8080
