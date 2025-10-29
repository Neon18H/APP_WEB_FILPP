import express from 'express';
import cors from 'cors';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

function getEnvVar(primaryKey, aliases = []) {
  const keys = [primaryKey, ...aliases];
  for (const key of keys) {
    const rawValue = process.env[key];
    if (typeof rawValue === 'string' && rawValue.trim() !== '') {
      return rawValue.trim();
    }
  }
  return undefined;
}

const PORT = process.env.PORT ?? 4000;
const TOKEN_COOKIE_NAME = process.env.TOKEN_COOKIE_NAME ?? 'sb-access-token';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? 'sb-refresh-token';
const TOKEN_REFRESH_MARGIN = process.env.TOKEN_REFRESH_MARGIN ?? '60';

const SUPABASE_URL = getEnvVar('SUPABASE_URL', [
  'VITE_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL'
]);
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', [
  'SUPABASE_SERVICE_ROLE',
  'SUPABASE_SERVICE_KEY'
]);
const SUPABASE_BUCKET = getEnvVar('SUPABASE_BUCKET', [
  'SUPABASE_STORAGE_BUCKET',
  'SUPABASE_BUCKET_NAME'
]);
const SUPABASE_CLIENTS_TABLE = getEnvVar('SUPABASE_CLIENTS_TABLE', [
  'SUPABASE_CLIENTS_TABLE_NAME',
  'SUPABASE_TABLE_CLIENTS'
]);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'Please set them (aliases supported: VITE_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, ' +
      'SUPABASE_SERVICE_ROLE, SUPABASE_SERVICE_KEY).'
  );
}
if (!SUPABASE_BUCKET) {
  throw new Error(
    'Missing SUPABASE_BUCKET environment variable. Aliases supported: SUPABASE_STORAGE_BUCKET, SUPABASE_BUCKET_NAME.'
  );
}
if (!SUPABASE_CLIENTS_TABLE) {
  throw new Error(
    'Missing SUPABASE_CLIENTS_TABLE environment variable. Aliases supported: SUPABASE_CLIENTS_TABLE_NAME, SUPABASE_TABLE_CLIENTS.'
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

const isProduction = process.env.NODE_ENV === 'production';
const tokenRefreshMargin = Number.parseInt(TOKEN_REFRESH_MARGIN, 10) || 60;
const signedUrlTTL = Math.max(60, 60 * 60 - tokenRefreshMargin);

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

function setSessionCookies(res, session) {
  const commonCookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    path: '/'
  };

  if (session?.access_token) {
    const maxAge = session.expires_in ? session.expires_in * 1000 : undefined;
    res.cookie(TOKEN_COOKIE_NAME, session.access_token, {
      ...commonCookieOptions,
      maxAge
    });
  }

  if (session?.refresh_token) {
    // Default refresh token lifetime ~30 days
    const refreshMaxAge = session.refresh_token_expires_in
      ? session.refresh_token_expires_in * 1000
      : 30 * 24 * 60 * 60 * 1000;
    res.cookie(REFRESH_COOKIE_NAME, session.refresh_token, {
      ...commonCookieOptions,
      maxAge: refreshMaxAge
    });
  }
}

function clearSessionCookies(res) {
  const options = { path: '/', sameSite: 'lax', secure: isProduction };
  res.clearCookie(TOKEN_COOKIE_NAME, options);
  res.clearCookie(REFRESH_COOKIE_NAME, options);
}

async function getUserFromAccessToken(accessToken) {
  if (!accessToken) {
    return { user: null, error: new Error('Missing access token') };
  }
  const { data, error } = await supabase.auth.getUser(accessToken);
  return { user: data?.user ?? null, error };
}

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    return { session: null, error: new Error('Missing refresh token') };
  }
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  return { session: data?.session ?? null, error };
}

async function ensureAuth(req, res, next) {
  try {
    const accessToken = req.cookies[TOKEN_COOKIE_NAME];
    const refreshToken = req.cookies[REFRESH_COOKIE_NAME];

    let { user, error } = await getUserFromAccessToken(accessToken);

    if (error && refreshToken) {
      const { session, error: refreshError } = await refreshSession(refreshToken);
      if (refreshError || !session) {
        clearSessionCookies(res);
        return res.status(401).json({ error: 'Sesión expirada' });
      }
      setSessionCookies(res, session);
      ({ user, error } = await getUserFromAccessToken(session.access_token));
      req.accessToken = session.access_token;
      req.session = session;
    } else {
      req.accessToken = accessToken;
    }

    if (error || !user) {
      clearSessionCookies(res);
      return res.status(401).json({ error: 'No autorizado' });
    }

    req.user = user;
    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Error validando sesión' });
  }
}

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  setSessionCookies(res, data.session);
  return res.json({
    user: data.user,
    session_expires_at: data.session.expires_at
  });
});

app.post('/api/auth/logout', (req, res) => {
  clearSessionCookies(res);
  return res.status(204).send();
});

app.get('/api/auth/me', ensureAuth, (req, res) => {
  const { email, id } = req.user;
  return res.json({
    id,
    email
  });
});

app.get('/api/clients', ensureAuth, async (req, res) => {
  const columns = 'id, name, contact, tax_id, payment_state, declaration_status, payment_amount, created_at, due_date, notes';
  const { data, error } = await supabase
    .from(SUPABASE_CLIENTS_TABLE)
    .select(columns)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: 'Error obteniendo clientes' });
  }

  return res.json({ clients: data ?? [] });
});

app.get('/api/clients/:id/docs', ensureAuth, async (req, res) => {
  const clientId = req.params.id;
  const { data, error } = await supabase.storage.from(SUPABASE_BUCKET).list(clientId, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' }
  });

  if (error) {
    const status = error.statusCode ?? error.status;
    if (status === 404) {
      return res.json({ documents: [] });
    }
    return res.status(500).json({ error: 'Error listando documentos' });
  }

  const files = data ?? [];
  const signed = await Promise.all(
    files.map(async (file) => {
      const path = `${clientId}/${file.name}`;
      const { data: urlData } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .createSignedUrl(path, signedUrlTTL);
      return {
        name: file.name,
        signedUrl: urlData?.signedUrl ?? null
      };
    })
  );

  return res.json({ documents: signed });
});

app.post('/api/clients/:id/docs', ensureAuth, upload.single('file'), async (req, res) => {
  const clientId = req.params.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'Archivo requerido' });
  }

  const sanitized = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
  const path = `${clientId}/${sanitized}`;

  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    return res.status(500).json({ error: 'Error subiendo archivo' });
  }

  const { data: urlData, error: urlError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(path, signedUrlTTL);

  if (urlError) {
    return res.status(500).json({ error: 'Documento subido sin URL firmada' });
  }

  return res.status(201).json({
    name: sanitized,
    signedUrl: urlData?.signedUrl ?? null
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'No encontrado' });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BFF listening on port ${PORT}`);
});
