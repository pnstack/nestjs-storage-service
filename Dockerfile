FROM node:16.14.2-alpine AS builder
RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm@8.2.0

# Create app directory
WORKDIR /app

COPY package*.json ./
RUN pnpm install

COPY . .
RUN npm run build

FROM node:16.14.2-alpine 
RUN apk add --no-cache libc6-compat
RUN npm i -g pnpm@8.2.0
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

RUN mkdir -p /app/uploads

VOLUME /app/uploads

EXPOSE 4000
CMD [ "npm", "run", "start:prod" ]