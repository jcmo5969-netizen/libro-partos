import bcrypt from 'bcryptjs';
import pool from '../db/connection.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para crear el usuario administrador inicial
 */
async function createAdmin() {
  try {
    console.log('🔄 Creando usuario administrador...');

    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;
    const nombreCompleto = process.env.ADMIN_NOMBRE || 'Administrador';
    const email = process.env.ADMIN_EMAIL || 'admin@hospital.cl';

    // Sin contraseña por defecto: obligar a definir ADMIN_PASSWORD en el entorno.
    if (!password || password.length < 8) {
      console.error('❌ Defina ADMIN_PASSWORD (>=8 caracteres) en el entorno antes de crear el administrador.');
      await pool.end();
      process.exit(1);
    }

    // Verificar si el usuario ya existe
    const existingUser = await pool.query(
      'SELECT id FROM usuarios WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      console.log('⚠️ El usuario administrador ya existe');
      
      // Preguntar si se quiere actualizar la contraseña
      if (process.argv.includes('--update-password')) {
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
          'UPDATE usuarios SET password_hash = $1, rol = $2, activo = $3 WHERE username = $4',
          [passwordHash, 'ADMIN', true, username]
        );
        console.log('✅ Contraseña del administrador actualizada');
      } else {
        console.log('💡 Usa --update-password para actualizar la contraseña');
      }
      
      await pool.end();
      process.exit(0);
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario administrador
    const result = await pool.query(
      'INSERT INTO usuarios (username, password_hash, nombre_completo, email, rol, activo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username',
      [username, passwordHash, nombreCompleto, email, 'ADMIN', true]
    );

    console.log('✅ Usuario administrador creado exitosamente!');
    console.log(`   Username: ${username}`);
    console.log(`   ⚠️ IMPORTANTE: Cambia la contraseña después del primer inicio de sesión`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando usuario administrador:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();

