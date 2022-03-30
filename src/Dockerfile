FROM --platform=linux/amd64 node:17-alpine

WORKDIR /app
RUN apk add chromium

COPY shapes ./shapes
COPY server ./server
COPY package.json .
COPY package-lock.json .

RUN npm install

RUN addgroup beaker && \
    adduser --gecos "" --ingroup beaker --disabled-password beaker

RUN chown -R beaker:beaker /app
RUN chmod 755 /app

USER beaker:beaker


ENTRYPOINT ["node", "server/index.js"]
