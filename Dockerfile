FROM node:18-bullseye

WORKDIR /app

# Устанавливаем build-essential для компиляции нативного модуля
RUN apt-get update && apt-get install -y build-essential

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
