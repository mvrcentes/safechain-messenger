# 🛡️ SafeChain Messenger

SafeChain Messenger es una aplicación segura de mensajería instantánea que implementa autenticación con múltiples factores y encriptación punto a punto. El proyecto usa tecnologías modernas como **React**, **Node.js**, **Prisma**, **PostgreSQL**, y **Docker**.

## 🚀 Tecnologías utilizadas

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL (vía Prisma ORM)
- **Autenticación:** JWT, contraseñas hasheadas con bcrypt, soporte para MFA
- **Contenedores:** Docker y Docker Compose
- **Gestor de paquetes:** npm y Bun

## ⚙️ Configuración del entorno

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/safechain-messenger.git
cd safechain-messenger
```

### 2. Variables de entorno

Crea los siguientes archivos `.env` dependiendo del entorno:

#### 📁 `backend/.env.local`

Este archivo se usa cuando corres el backend localmente:

```
PORT=4000

DB_USER=postgres
DB_HOST=localhost 
DB_NAME=postgres
DB_PASSWORD=postgres
DB_PORT=5432
```

#### 📁 `backend/.env.docker`

Este archivo se usa cuando corres la app con Docker:

```
PORT=4000

DB_USER=postgres
DB_HOST=safechain-postgres
DB_NAME=postgres
DB_PASSWORD=postgres
DB_PORT=5432
```

#### 📁 `frontend/.env`

```
VITE_API_URL=http://localhost:4000
```

Asegúrate de que los nombres de archivo y variables sean consistentes con los definidos en tu código y configuración de Docker Compose.

### 3. Instalación de dependencias

#### Backend

```bash
cd backend
npm install # o bun install
npx prisma generate
npx prisma migrate dev --name init
```

#### Frontend

```bash
cd ../frontend
npm install # o bun install
```

### 3.1 Crear base de datos con Prisma

Prisma te permite crear la base de datos automáticamente a partir del esquema definido en `schema.prisma`. Ejecuta el siguiente comando desde la carpeta `backend`:

```bash
npx prisma migrate dev --name init
```

Esto creará la base de datos, aplicará las migraciones y generará el cliente Prisma.

### 4. Iniciar servidores

En terminales separadas:

- **Backend:**

  ```bash
  cd backend
  npm run dev
  ```

- **Frontend:**

  ```bash
  cd frontend
  npm run dev
  ```

## 🐳 Uso con Docker

### 1. Crear archivo `.env` en raíz del proyecto (o usar `backend/.env`)

Asegúrate de que `DATABASE_URL` y `JWT_SECRET` estén definidos.

### 2. Iniciar los contenedores

```bash
docker-compose up --build
```

Esto levanta los servicios del backend, frontend y PostgreSQL.

### 3. Detener servicios

```bash
docker-compose down
```

## 📬 Funcionalidades

- Registro y login de usuarios
- Autenticación con JWT
- Opcional: verificación con código MFA
- Envío de mensajes entre usuarios autenticados
- Gestión de sesiones

## 📁 Estructura del proyecto

```
safechain-messenger/
├── backend/
│   ├── src/
│   ├── prisma/
│   └── Dockerfile
├── frontend/
│   └── vite.config.js
└── docker-compose.yml
```

## ✅ Requisitos

- Node.js >= 18
- Docker & Docker Compose
- PostgreSQL (local o en contenedor)

## 🧪 Pruebas de seguridad

- [x] OWASP ZAP
- [x] SonarQube
- [x] Burp Suite (trial)
- [ ] Revisión manual de encriptación y tokens

## 📝 Licencia

MIT License