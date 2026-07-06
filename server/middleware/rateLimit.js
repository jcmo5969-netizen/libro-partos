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
