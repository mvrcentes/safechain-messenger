# SAFECHAIN-MESSENGER

<!-- Badges -->

![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Express.js](https://img.shields.io/badge/Express%20js-000000?style=for-the-badge&logo=express&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Axios](https://img.shields.io/badge/axios-671ddf?&style=for-the-badge&logo=axios&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)
![Zod](https://img.shields.io/badge/Zod-000000?style=for-the-badge&logo=zod&logoColor=3068B7)
![bun](https://img.shields.io/badge/bun-282a36?style=for-the-badge&logo=bun&logoColor=fbf0df)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

---

## 📑 Tabla de contenidos

- [Descripción](#descripción)
- [Objetivos del Proyecto](#objetivos-del-proyecto)
- [Tecnologías](#🛠-tecnologías)
- [Primeros pasos](#🚀-primeros-pasos)
- [Configuración del entorno](#⚙️-configuración-del-entorno)
- [Uso con Docker](#🐳-uso-con-docker)
- [Funcionalidades](#📬-funcionalidades)
- [Estructura del proyecto](#📁-estructura-del-proyecto)
- [Requisitos](#✅-requisitos)
- [Pruebas de seguridad](#🧪-pruebas-de-seguridad)
- [Licencia](#📝-licencia)

## 📖 Descripción

SafeChain Messenger es una aplicación de mensajería instantánea diseñada para ofrecer el máximo nivel de seguridad y privacidad.  
Implementa autenticación multifactor (MFA) y cifrado de extremo a extremo para cada conversación.  
Gracias a su arquitectura moderna basada en React, Node.js y Prisma, garantiza rapidez, escalabilidad y facilidad de mantenimiento.  
Docker y PostgreSQL proveen un entorno consistente y confiable para el despliegue en cualquier entorno.

---

## 🎯 Objetivos del Proyecto

1. **Autenticación Segura (MFA)**  
   Permitir registro e inicio de sesión con múltiples factores (TOTP/WebAuthn).
2. **Cifrado de Mensajes**
   - Chats 1:1 con AES-256 + RSA/ECC.
   - Chats grupales con clave simétrica AES-256-GCM.
3. **Firma Digital**  
   Firmar cada mensaje para garantizar autenticidad.
4. **Integridad de Datos**  
   Verificar los mensajes con hashing SHA-256.
5. **Mini‐Blockchain**  
   Registrar cada transacción (remitente, fecha, contenido) en una cadena inmutable.

---

## 🛠 Tecnologías

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **ORM:** Prisma
- **Validación:** Zod
- **HTTP Client:** Axios
- **Runtime:** bun
- **Base de datos:** PostgreSQL
- **Contenedores:** Docker

---

## 🚀 Primeros pasos

## ⚙️ Configuración del entorno

Este proyecto requiere las siguientes dependencias:

- **Lenguaje de programación:** JavaScript
- **Gestor de paquetes:** bun
- **Runtime de contenedor:** Docker

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
PORT=puerto-del-server

JWT_SECRET=secret
JWT_EXPIRATION=15m

DATABASE_URL=url-del-postgres

# Configuración para la bd en docker 

POSTGRES_CONTAINER_NAME=nombre-del-contenedor

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=postgres

POSTGRES_LOCAL_PORT=5432
POSTGRES_DOCKER_PORT=5432
```

#### 📁 `frontend/.env`

```
VITE_API_URL=url-del-servidor-para-consumir-el-api
VITE_JWT_SECRET=secret
```


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
bunx prisma migrate dev --name init
```

Esto creará la base de datos, aplicará las migraciones y generará el cliente Prisma.

### 4. Iniciar servidores

En terminales separadas:

- **Backend:**

  ```bash
  cd backend \
  bun run dev
  ```

- **Frontend:**

  ```bash
  cd frontend \
  bun run dev
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
