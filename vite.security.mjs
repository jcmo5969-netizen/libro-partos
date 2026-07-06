/**
 * Cabeceras HTTP y CORS para Vite (dev/preview).
 * HSTS: solo con VITE_ENABLE_HSTS=1 (HTTPS detrás de proxy).
 * Orígenes: definir VITE_ALLOWED_ORIGINS o CORS_ORIGIN (coma-separados) en producción.
 */

const PRIVATE_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/i

function parseAllowedOrigins() {
  const raw = process.env.VITE_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || ''
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function defaultLocalOrigins(ports) {
  const list = []
  for (const p of ports) {
    list.push(`http://localhost:${p}`, `http://127.0.0.1:${p}`)
  }
  return list
}

export function getSecurityHeaders() {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-Download-Options': 'noopen',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  }

  if (process.env.VITE_ENABLE_HSTS === '1') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
  }

  const isProd = process.env.NODE_ENV === 'production'
  const connectParts = new Set(["'self'"])
  if (!isProd) {
    connectParts.add('ws:')
    connectParts.add('wss:')
    connectParts.add('http://localhost:*')
    connectParts.add('http://127.0.0.1:*')
  }
  const api = process.env.VITE_API_URL || ''
  if (api.startsWith('http')) {
    try {
      const u = new URL(api)
      connectParts.add(`${u.protocol}//${u.host}`)
    } catch {
      /* ignore */
    }
  }
  if (process.env.VITE_CSP_CONNECT_EXTRA) {
    for (const part of process.env.VITE_CSP_CONNECT_EXTRA.split(',')) {
      const t = part.trim()
      if (t) connectParts.add(t)
    }
  }

  const isBuildOrProdPreview = process.env.NODE_ENV === 'production'
  const scriptSrc = isBuildOrProdPreview
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'"

  headers['Content-Security-Policy'] = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `connect-src ${[...connectParts].join(' ')}`,
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return headers
}

/**
 * CORS del servidor de desarrollo/preview de Vite (sustituye Access-Control-Allow-Origin: *).
 * @param {{ defaultPorts: number[] }} opts
 */
export function getViteCorsConfig(opts = { defaultPorts: [3000, 5173, 3002] }) {
  const fromEnv = parseAllowedOrigins()
  const fallback = defaultLocalOrigins(opts.defaultPorts)
  const allowed = fromEnv.length > 0 ? fromEnv : fallback

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowed.includes(origin)) {
        callback(null, true)
        return
      }
      if (process.env.VITE_CORS_ALLOW_ANY === '1') {
        callback(null, true)
        return
      }
      if (process.env.VITE_ALLOW_PRIVATE_NETWORK_ORIGINS === '1' && PRIVATE_ORIGIN_RE.test(origin)) {
        callback(null, true)
        return
      }
      if (process.env.NODE_ENV !== 'production' && PRIVATE_ORIGIN_RE.test(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS: origen no permitido (${origin})`))
    },
    credentials: true,
  }
}
