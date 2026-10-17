FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 ENABLE_SQL=false
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node app.js core.js live.js playback.js server.js tmdb.js ./
COPY --chown=node:node providers ./providers
USER node
EXPOSE 3000
CMD ["node", "server.js"]
