# صورة إنتاج صغيرة — تشتغل على أي سيرفر أو خدمة تدعم Docker
FROM node:22-alpine

WORKDIR /app

# نثبت الاعتماديات أول لحالها حتى تستفيد من الكاش عند إعادة البناء
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/index.js"]
