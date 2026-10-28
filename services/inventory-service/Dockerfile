FROM node:22-alpine

WORKDIR /app

# Copia de manifiesto de dependencias para caching de capas
COPY package*.json ./

# Instalación limpia para producción
RUN npm install --omit=dev

# Copia del código fuente del servicio
COPY . .

# Puerto interno del servicio
EXPOSE 3002

CMD ["npm", "start"]
