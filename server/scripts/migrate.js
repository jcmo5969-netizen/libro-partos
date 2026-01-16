import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script para ejecutar migraciones SQL
 */
async function runMigrations() {
  try {
    console.log('🔄 Ejecutando migraciones...');
    
    // Leer archivo schema.sql
    const schemaPath = path.join(__dirname, '../../migrations/schema.sql');
    const usersPath = path.join(__dirname, '../../migrations/users.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ No se encontró el archivo schema.sql en:', schemaPath);
      process.exit(1);
    }
    
    if (!fs.existsSync(usersPath)) {
      console.error('❌ No se encontró el archivo users.sql en:', usersPath);
      process.exit(1);
    }
    
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    const usersSQL = fs.readFileSync(usersPath, 'utf-8');
    
    // Migración adicional para campos correlativo y creado_por
    const correlativoPath = path.join(__dirname, '../../migrations/add_correlativo_creado_por.sql');
    const correlativoSQL = fs.existsSync(correlativoPath) 
      ? fs.readFileSync(correlativoPath, 'utf-8')
      : null;
    
    console.log('📄 Schemas SQL leídos');
    
    // Verificar conexión
    await pool.query('SELECT NOW()');
    console.log('✅ Conexión a PostgreSQL verificada');
    
    // Ejecutar migración de correlativo y creado_por PRIMERO (si existe y la tabla ya existe)
    if (correlativoSQL) {
      try {
        // Verificar si la tabla existe
        const tableCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'partos'
          );
        `);
        
        if (tableCheck.rows[0].exists) {
          console.log('📝 Ejecutando migración de correlativo y creado_por...');
          await pool.query(correlativoSQL);
        }
      } catch (error) {
        console.warn('⚠️ Advertencia al ejecutar migración de correlativo:', error.message);
      }
    }
    
    // Ejecutar schema SQL
    console.log('📝 Ejecutando schema SQL...');
    await pool.query(schemaSQL);
    
    // Ejecutar users SQL
    console.log('📝 Ejecutando users SQL...');
    await pool.query(usersSQL);
    
    console.log('✅ Migraciones completadas exitosamente!');
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();

