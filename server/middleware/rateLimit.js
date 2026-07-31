import rateLimit from 'express-rate-limit';

/**
 * Limita los intentos de login para frenar fuerza bruta / credential stuffing.
 * Solo cuenta intentos FALLIDOS (skipSuccessfulRequests), así un usuario legítimo
 * que acierta no consume el cupo. 5 intentos fallidos / 15 min por IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
});

/**
 * Límite general para rutas autenticadas (/api/partos, /api/usuarios,
 * /api/auth/change-password). Antes solo /api/auth/login tenía rate limiting,
 * dejando sin fricción el volcado repetido de PHI vía /api/partos o la fuerza
 * bruta contra change-password. 300/5min por IP es generoso para el uso normal
 * (getAllPartos() del frontend pagina en lotes de 1000, pocas requests por carga)
 * pero acota el scraping/abuso automatizado.
 */
export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});
