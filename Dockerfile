FROM node:18

WORKDIR /app

COPY package.json ./
RUN npm install

# Grant full read/write/execute permissions to everyone in the container

COPY . .

EXPOSE 3005

CMD ["node", "server.js"]