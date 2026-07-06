import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Migraciones ALTER TABLE idempotentes (usan IF NOT EXISTS).
// Se ejecutan en cada arranque del servidor para garantizar que el
// esquema esté alineado con el código desplegado y evitar fallos de
// tipo "column does not exist" al insertar/actualizar partos.
const idempotentMigrations = [
  'add_correlativo_creado_por.sql',
  'add_medicos_robson_gemelar.sql',
  'add_hora_destino_gemelar.sql',
  'add_causa_cesarea_electiva.sql',
  'add_peso_talla_registrado.sql',
  'add_imc_materno.sql',
  'widen_grupo_rh.sql',
];

export async function runAutoMigrations() {
  const migrationsDir = path.join(__dirname, '../../migrations');

  if (!fs.existsSync(migrationsDir)) {
    console.warn(`⚠️  Directorio de migraciones no encontrado: ${migrationsDir}`);
    return;
  }

  console.log('🔧 Verificando esquema de base de datos (auto-migraciones)...');

  for (const file of idempotentMigrations) {
    const filePath = path.join(migrationsDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️  Migración no encontrada, omitiendo: ${file}`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      await pool.query(sql);
      console.log(`   ✅ ${file}`);
    } catch (error) {
      console.error(`   ❌ Error aplicando ${file}: ${error.message}`);
      // No detener el arranque del servidor: los partos existentes
      // deben seguir siendo consultables aunque falle una migración.
    }
  }

  console.log('✅ Auto-migraciones completadas');
}
