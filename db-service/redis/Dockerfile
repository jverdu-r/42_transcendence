FROM redis:7.2-alpine

LABEL maintainer="jolopez- <jolopez-@student.42madrid.com>"

RUN mkdir -p /usr/local/etc/redis
COPY redis.conf healthcheck.sh /usr/local/etc/redis/
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Europe/Madrid /etc/localtime && \
    echo "Europe/Madrid" > /etc/timezone && \
    apk del tzdata
RUN chmod +x /usr/local/etc/redis/healthcheck.sh

RUN mkdir -p /data && \
    chown redis:redis /data && \
    chmod 750 /data

EXPOSE 6379

RUN chmod 755 /usr/local/etc/redis/healthcheck.sh

RUN chown -R redis:redis /usr/local/etc/redis && \
    chmod 600 /usr/local/etc/redis/redis.conf

USER redis
CMD ["sh", "-c", "export REDIS_PASSWORD=$(cat ${REDIS_PASSWORD_FILE}) && exec redis-server /usr/local/etc/redis/redis.conf"]