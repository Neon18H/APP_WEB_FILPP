# FILPP BFF

Servicio Backend for Frontend (Node.js + Express) que encapsula la comunicación con Supabase para la app de clientes.

## Configuración
1. Copia `.env.example` a `.env` y completa:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_BUCKET`
   - `SUPABASE_CLIENTS_TABLE`
2. (Opcional) ajusta `TOKEN_COOKIE_NAME`, `REFRESH_COOKIE_NAME` o el `PORT` según tus necesidades.

## Uso
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

Todos los endpoints (excepto login) requieren sesión activa. Las credenciales se mantienen mediante cookies HTTP-only generadas por el BFF.

## Notas
- El tamaño máximo de archivo es 15MB (configurado con Multer).
- Las URL firmadas de documentos caducan en ~1 hora.
