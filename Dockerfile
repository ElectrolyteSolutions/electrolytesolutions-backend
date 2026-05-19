FROM node:22-alpine

WORKDIR /app

# Copy package files first to leverage Docker caching layers
COPY package*.json ./
RUN npm install

# Copy the rest of the application code (ignores node_modules if .dockerignore exists)
COPY . .

EXPOSE 3005

CMD ["node", "server.js"]