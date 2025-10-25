# Clientes (Admin) • Supabase (Web)

App web estática (HTML + JS) con **autenticación de admins**, **listado de `clients`** y **carga/listado de documentos** por cliente en `Storage`.

## 🚀 Uso
1. Abre `index.html` y configura:
```js
const SUPABASE_URL = "https://<tu-proyecto>.supabase.co";
const SUPABASE_ANON_KEY = "<tu-anon-key>";
const CLIENTS_TABLE = "clients";
const BUCKET = "client_docs";
```
2. Abre el archivo en el navegador o sirve de forma estática.

## 🔐 SQL necesario
Revisa `setup_admins.sql` y ejecútalo en el SQL Editor de Supabase: crea `admins`, activa RLS y políticas para `clients` y `storage.objects` (bucket privado `client_docs`).

## 👤 Alta de admin
Crea usuario en **Auth → Users**, copia el UUID y:
```sql
insert into public.admins (user_id, email) values ('<UUID>', '<email>');
```

## 🔎 Notas
- Las URL de documentos son **firmadas** por 1 hora (bucket privado).
- Si deseas más campos, edita el `select()` en `listClients()`.
