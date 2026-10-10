FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY src ./src
COPY server ./server
USER node
EXPOSE 8080
CMD ["node", "server/main.js"]
