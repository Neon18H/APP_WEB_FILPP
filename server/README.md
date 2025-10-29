# FILPP BFF

Servicio Backend for Frontend (Node.js + Express) que encapsula la comunicación con Supabase para la app de clientes.

## Configuración
1. Copia `.env.example` a `.env` y completa:
   - `SUPABASE_URL` (aliases soportados: `VITE_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`)
   - `SUPABASE_SERVICE_ROLE_KEY` (aliases soportados: `SUPABASE_SERVICE_ROLE`, `SUPABASE_SERVICE_KEY`)
   - `SUPABASE_BUCKET` (aliases soportados: `SUPABASE_STORAGE_BUCKET`, `SUPABASE_BUCKET_NAME`)
   - `SUPABASE_CLIENTS_TABLE` (aliases soportados: `SUPABASE_CLIENTS_TABLE_NAME`, `SUPABASE_TABLE_CLIENTS`)
2. (Opcional) ajusta `TOKEN_COOKIE_NAME`, `REFRESH_COOKIE_NAME` o el `PORT` según tus necesidades.

## Uso local con Node.js
```bash
npm install
npm start
```
El servidor se inicia en `http://localhost:4000` por defecto y expone:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/clients`
- `GET /api/clients/:id/docs`
- `POST /api/clients/:id/docs`

Todos los endpoints (excepto login) requieren sesión activa. Las credenciales se mantienen mediante cookies HTTP-only generadas
por el BFF.

## Ejecutar con Docker
1. Construye la imagen del servicio:
   ```bash
   docker build -t filpp-bff .
   ```
2. Ejecuta el contenedor (asegúrate de pasar las variables de entorno necesarias):
   ```bash
   docker run --rm -p 4000:4000 \
     -e SUPABASE_URL=... \
     -e SUPABASE_SERVICE_ROLE_KEY=... \
     -e SUPABASE_BUCKET=... \
     -e SUPABASE_CLIENTS_TABLE=... \
     filpp-bff
   ```

Si ya cuentas con un archivo `.env`, puedes montarlo directamente:
```bash
docker run --rm -p 4000:4000 --env-file .env filpp-bff
```

## Notas
- El tamaño máximo de archivo es 15MB (configurado con Multer).
- Las URL firmadas de documentos caducan en ~1 hora.
