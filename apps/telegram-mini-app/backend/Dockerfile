FROM node:20-alpine AS build
WORKDIR /app
COPY apps/telegram-mini-app/backend/package*.json ./
RUN npm install
COPY apps/telegram-mini-app/backend/tsconfig.json ./
COPY apps/telegram-mini-app/backend/src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY apps/telegram-mini-app/backend/package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY apps/telegram-mini-app/webapp ./webapp
EXPOSE 3000
CMD ["npm", "start"]
