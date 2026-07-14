/**
 * Reseteo forzado de contraseñas comprometidas (matronas / rol USUARIO).
 *
 * Contexto: las contraseñas Mtrn01–Mtrn24 seguían un patrón predecible y se
 * consideran comprometidas. Este script asigna a cada cuenta afectada una
 * contraseña ALEATORIA y única, invalidando de inmediato las antiguas.
 *
 * SEGURIDAD:
 *   - Por defecto corre en modo DRY-RUN (no escribe nada). Muestra a quién afectaría.
 *   - Solo con --confirm realiza los cambios en la base de datos.
 *   - Nunca toca cuentas ADMIN.
 *   - Con --confirm escribe las nuevas credenciales en un CSV LOCAL (gitignored)
 *     para que el administrador las distribuya por un canal seguro y luego lo borre.
 *
 * Uso:
 *   node server/scripts/resetMatronaPasswords.js                 # dry-run (todas las USUARIO)
 *   node server/scripts/resetMatronaPasswords.js --confirm        # aplica a todas las USUARIO
 *   node server/scripts/resetMatronaPasswords.js user1 user2      # dry-run solo esos usuarios
 *   node server/scripts/resetMatronaPasswords.js user1 --confirm  # aplica solo a user1
 */
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const CONFIRM = args.includes('--confirm');
const usernames = args.filter((a) => !a.startsWith('--'));

/** Genera una contraseña aleatoria legible (sin caracteres ambiguos). */
function generatePassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(16);
  let out = '';
  for (let i = 0; i < 14; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function main() {
  console.log(`🔐 Reseteo de contraseñas — modo: ${CONFIRM ? 'CONFIRMAR (escribe en BD)' : 'DRY-RUN (solo simulación)'}`);

  let query;
  let params;
  if (usernames.length > 0) {
    query = `SELECT id, username, rol FROM usuarios WHERE username = ANY($1) AND rol = 'USUARIO' AND activo = TRUE ORDER BY username`;
    params = [usernames];
  } else {
    query = `SELECT id, username, rol FROM usuarios WHERE rol = 'USUARIO' AND activo = TRUE ORDER BY username`;
    params = [];
  }

  const { rows } = await pool.query(query, params);

  if (rows.length === 0) {
    console.log('⚠️  No se encontraron cuentas USUARIO activas que coincidan. Nada que hacer.');
    await pool.end();
    process.exit(0);
  }

  console.log(`👥 Cuentas afectadas (${rows.length}):`);
  rows.forEach((r) => console.log(`   - ${r.username}`));

  if (!CONFIRM) {
    console.log('\nℹ️  DRY-RUN: no se cambió ninguna contraseña. Ejecuta con --confirm para aplicar.');
    await pool.end();
    process.exit(0);
  }

  const nuevas = [];
  for (const user of rows) {
    const password = generatePassword();
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE usuarios SET password_hash = $1, must_change_password = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [hash, user.id]
    );
    nuevas.push({ username: user.username, password });
  }

  const outFile = path.join(__dirname, `credenciales-nuevas-${Date.now()}.csv`);
  const csv = 'username,password\n' + nuevas.map((n) => `${n.username},${n.password}`).join('\n') + '\n';
  fs.writeFileSync(outFile, csv, { mode: 0o600 });

  console.log(`\n✅ ${nuevas.length} contraseñas reseteadas.`);
  console.log(`📄 Nuevas credenciales escritas en: ${outFile}`);
  console.log('   → Distribúyelas por un canal seguro y BORRA el archivo después.');

  await pool.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('❌ Error en el reseteo:', err.message);
  try { await pool.end(); } catch { /* noop */ }
  process.exit(1);
});
