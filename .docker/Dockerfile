FROM node:22.11.0-alpine3.20

RUN adduser -D -u 1001 -s /bin/sh app

USER app

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY --chown=app:app . .

CMD [ "npm", "start" ]
