FROM node:12.5-alpine

RUN apk update && apk add --no-cache bash git openssh tzdata

WORKDIR /app

COPY etc etc
COPY lib lib
COPY package*.json ./
COPY serve.js serve.js
COPY app.js app.js

RUN mkdir scenarios
RUN npm ci --production

# solution for core-js postinstall script hang up
# https://github.com/zloirock/core-js/issues/673#issuecomment-550199917
RUN npm config set unsafe-perm true

CMD npm start
