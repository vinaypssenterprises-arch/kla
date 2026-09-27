FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN chmod -R +x node_modules/.bin || true
RUN npx prisma generate
EXPOSE 5000
CMD ["sh", "-c", "npx prisma db push && node prisma/seed.js && npm run dev"]
