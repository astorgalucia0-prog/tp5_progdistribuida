/**
 * Procedimiento separado y seguro para dar de alta o elevar un Administrador.
 * Ejecutable exclusivamente desde la terminal del servidor.
 * Uso: node scripts/create-admin.js [email] [password] [username] [nombre]
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI_AUTH = process.env.MONGODB_URI_AUTH || 'mongodb://127.0.0.1:27017/db_auth';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const args = process.argv.slice(2);
const email = (args[0] || process.env.ADMIN_EMAIL || 'admin@uch.edu.ar').trim().toLowerCase();
const password = args[1] || process.env.ADMIN_PASSWORD || 'AdminSecure2026Distributed';
const username = (args[2] || process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
const nombre = args[3] || 'Administrador del Sistema';

async function createAdmin() {
  console.log('===============================================================');
  console.log('  PROCEDIMIENTO SEPARADO DE ALTA DE ADMINISTRADORES (TP7)');
  console.log(`  Conectando a: ${MONGODB_URI_AUTH}`);
  console.log(`  Admin Email: ${email}`);
  console.log('===============================================================\n');

  // Conexión explícita a la base de datos db_auth
  await mongoose.connect(MONGODB_URI_AUTH, { dbName: 'db_auth' });
  console.log('Conexión con db_auth establecida.');

  const db = mongoose.connection.useDb('db_auth');
  const usersCollection = db.collection('users');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Buscar si ya existe por email o username
  const existing = await usersCollection.findOne({
    $or: [{ email }, { username }]
  });

  if (existing) {
    console.log(`El usuario '${email}' ya existe (ID: ${existing._id}). Actualizando contraseña y rol ADMIN...`);
    await usersCollection.updateOne(
      { _id: existing._id },
      {
        $set: {
          role: 'ADMIN',
          passwordHash,
          activo: true,
          updatedAt: new Date()
        }
      }
    );
    console.log(`✅ Usuario '${email}' actualizado exitosamente con rol ADMIN.`);
  } else {
    console.log(`Creando nuevo administrador '${email}'...`);
    const insertResult = await usersCollection.insertOne({
      username,
      email,
      passwordHash,
      role: 'ADMIN',
      nombre,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log(`✅ Administrador '${email}' creado exitosamente (ID: ${insertResult.insertedId}).`);
  }

  // Verificar que el hash recién guardado coincida con la contraseña
  const verifyDoc = await usersCollection.findOne({ email });
  const matches = await bcrypt.compare(password, verifyDoc.passwordHash);
  if (matches) {
    console.log(`🔒 Verificación exitosa: la contraseña provista valida correctamente contra el hash en db_auth.`);
  } else {
    console.error(`❌ Error crítico: el hash generado no coincide con la contraseña.`);
  }

  await mongoose.disconnect();
  console.log('Conexión finalizada.');
}

createAdmin().catch((err) => {
  console.error('Error al crear administrador:', err.message);
  process.exit(1);
});
