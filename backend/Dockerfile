# Usa la imagen oficial de Bun
FROM oven/bun:latest

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia archivos de configuración de dependencias
COPY bun.lock* package.json ./

# Instala dependencias con Bun
RUN bun install

# Copia el resto del código de la aplicación
COPY . .

# Expone el puerto definido en entorno (opcionalmente puedes poner 4000 directamente)
EXPOSE 4000

# Comando por defecto para iniciar el backend
CMD ["bun", "run", "dev"]