FROM node:22-alpine

WORKDIR /app

# Copia de manifiesto de dependencias para caching de capas
COPY package*.json ./

# Instalación limpia y reproducible para producción
RUN npm ci --omit=dev

# Copia del código fuente del servicio
COPY . .

# Puerto interno del servicio
EXPOSE 8080

CMD ["npm", "start"]
