FROM nginx:latest AS base
#纯净版镜像
# 定义作者
MAINTAINER = harver<180238813@.qq.com>
# NODE_ENV(node 环境) APP_PATH(工作目录)
ENV APP_PATH=/app
WORKDIR $APP_PATH
COPY dist/ $APP_PATH
COPY bs.conf $APP_PATH
COPY ssl/ $APP_PATH/ssl
COPY nginx.conf /etc/nginx/conf.d/nginx.conf
EXPOSE 80
