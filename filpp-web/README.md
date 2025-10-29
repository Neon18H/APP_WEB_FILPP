# Clientes (Admin) • Supabase (Web)

Aplicación web para admins con **autenticación**, **listado de `clients`** y **carga/listado de documentos** por cliente en `Storage`.

A partir de esta versión la comunicación con Supabase se realiza mediante un **Backend for Frontend (BFF)** que expone endpoints seguros para autenticación y archivos.

## 🚀 Uso rápido
1. Copia `server/.env.example` a `server/.env` y completa tus credenciales de Supabase (usa una Service Role Key).
2. Instala dependencias del BFF: `npm install --prefix server`.
3. Inicia el BFF: `npm run --prefix server start` (por defecto usa `http://localhost:4000`).
4. Sirve `2.html` (por ejemplo con `npx serve` o cualquier servidor estático) **en el mismo dominio** o configura un proxy que reenvíe las rutas `/api/*` hacia el BFF.

## 🔐 SQL necesario
Revisa `setup_admins.sql` y ejecútalo en el SQL Editor de Supabase: crea `admins`, activa RLS y políticas para `clients` y `storage.objects` (bucket privado `client_docs`).

## 👤 Alta de admin
Crea usuario en **Auth → Users**, copia el UUID y:
```sql
insert into public.admins (user_id, email) values ('<UUID>', '<email>');
```

## 🔎 Notas
- Las URL de documentos son **firmadas** por 1 hora (bucket privado).
- Si deseas más campos, edita el `select` en el endpoint `/api/clients` del BFF.
- Los tokens se manejan mediante cookies HTTP-only generadas por el BFF.
