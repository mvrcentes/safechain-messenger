# Usa una imagen base ligera de Node.js
FROM node:23-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia archivos de dependencias
COPY package*.json ./
COPY bun.lock* ./

# Instala las dependencias del frontend
RUN rm -rf node_modules package-lock.json && npm install --omit=optional
RUN npm install

# Copia el resto del código fuente
COPY . .

# Expone el puerto usado por Vite (por defecto 5173)
EXPOSE 5173

# Comando para iniciar Vite en modo desarrollo
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]