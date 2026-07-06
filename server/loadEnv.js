/**
 * Debe ser el primer import de server.js.
 * En ESM los imports se resuelven antes del código del módulo principal;
 * si dotenv solo corre después de importar middleware/auth.js, JWT_SECRET del .env no existe aún.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
