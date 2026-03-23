FROM node:18-alpine

WORKDIR /app

# Устанавливаем зависимости для сборки нативных модулей (нужно для swisseph)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
