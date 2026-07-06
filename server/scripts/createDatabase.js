import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

/**
 * Script para crear la base de datos y ejecutar todas las migraciones
 */
async function createDatabaseAndMigrate() {
  let adminPool = null;
  let appPool = null;

  try {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = parseInt(process.env.DB_PORT || '5432');
    const dbName = process.env.DB_NAME || 'libro_partos';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || '';

    console.log('🔄 Iniciando creación de base de datos...');
    console.log(`   Host: ${dbHost}`);
    console.log(`   Puerto: ${dbPort}`);
    console.log(`   Usuario: ${dbUser}`);
    console.log(`   Base de datos: ${dbName}`);

    // Conectar a la base de datos 'postgres' para crear la nueva base de datos
    adminPool = new Pool({
      host: dbHost,
      port: dbPort,
      database: 'postgres', // Conectarse a postgres para crear la nueva BD
      user: dbUser,
      password: dbPassword,
      connectionTimeoutMillis: 10000,
    });

    console.log('📡 Conectando a PostgreSQL...');
    await adminPool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL exitosa');

    // Verificar si la base de datos existe
    console.log(`\n🔍 Verificando si la base de datos '${dbName}' existe...`);
    const dbCheck = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (dbCheck.rows.length > 0) {
      console.log(`ℹ️  La base de datos '${dbName}' ya existe`);
    } else {
      console.log(`📦 Creando base de datos '${dbName}'...`);
      await adminPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Base de datos '${dbName}' creada exitosamente`);
    }

    // Cerrar conexión admin
    await adminPool.end();
    adminPool = null;

    // Conectar a la nueva base de datos
    console.log(`\n📡 Conectando a la base de datos '${dbName}'...`);
    appPool = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    await appPool.query('SELECT NOW()');
    console.log('✅ Conexión a la base de datos exitosa');

    // Definir migraciones en orden de ejecución
    // IMPORTANTE: schema.sql y users.sql van primero; el resto son ALTER TABLE idempotentes
    const migrationsDir = path.join(__dirname, '../../migrations');
    const migrationFiles = [
      { file: 'schema.sql', label: 'Schema base', critical: true },
      { file: 'users.sql', label: 'Tabla de usuarios', critical: false },
      { file: 'add_correlativo_creado_por.sql', label: 'Correlativo y creado_por', critical: false },
      { file: 'add_medicos_robson_gemelar.sql', label: 'Médicos/Robson/gemelar', critical: false },
      { file: 'add_hora_destino_gemelar.sql', label: 'Hora/destino gemelar', critical: false },
      { file: 'add_causa_cesarea_electiva.sql', label: 'Causa de cesárea electiva', critical: false },
      { file: 'add_peso_talla_registrado.sql', label: 'Peso/talla materna y registrado_por', critical: false },
    ];

    console.log('\n📝 Ejecutando migraciones...');

    for (let i = 0; i < migrationFiles.length; i++) {
      const { file, label, critical } = migrationFiles[i];
      const filePath = path.join(migrationsDir, file);

      if (!fs.existsSync(filePath)) {
        if (critical) {
          throw new Error(`No se encontró archivo crítico: ${filePath}`);
        }
        console.log(`   [${i + 1}/${migrationFiles.length}] ⚠️  No encontrado (omitido): ${file}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`   [${i + 1}/${migrationFiles.length}] Ejecutando ${file} (${label})...`);

      try {
        await appPool.query(sql);
        console.log(`   ✅ ${label} aplicada`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('ya existe')) {
          console.log(`   ℹ️  ${label} ya aplicada`);
        } else if (critical) {
          throw error;
        } else {
          console.log(`   ⚠️  Advertencia (${file}): ${error.message}`);
        }
      }
    }

    console.log('\n✅ Todas las migraciones completadas exitosamente!');

    await appPool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Código: ${error.code}`);
    }
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    if (adminPool) {
      await adminPool.end().catch(() => {});
    }
    if (appPool) {
      await appPool.end().catch(() => {});
    }

    process.exit(1);
  }
}

createDatabaseAndMigrate();
