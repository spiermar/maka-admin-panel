#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { sql } = require('@vercel/postgres');
const bcrypt = require('bcrypt');

function generateRandomPassword() {
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(12);
  const base64 = randomBytes.toString('base64');
  const alphanumeric = base64.replace(/[^a-zA-Z0-9]/g, '');
  return alphanumeric.substring(0, 16);
}

function displayCredentials(username, password) {
  console.log('');
  console.log('========================================');
  console.log('ADMIN USER CREDENTIALS GENERATED');
  console.log('========================================');
  console.log(`Username: ${username}`);
  console.log(`Password: ${password}`);
  console.log('========================================');
  console.log('⚠️  CHANGE THIS PASSWORD IMMEDIATELY! ⚠️');
  console.log('========================================');
  console.log('');
}

async function executeSQLFile(filePath) {
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  await sql.query(sqlContent);
}

async function main() {
  try {
    console.log('🚀 Initializing database...');

    const schemaPath = path.join(__dirname, '../lib/db/schema.sql');
    const seedPath = path.join(__dirname, 'init-db.sql');

    await executeSQLFile(schemaPath);
    await executeSQLFile(seedPath);
    console.log('✅ Schema and base data loaded');

    const username = 'admin';
    const password = generateRandomPassword();
    const hash = await bcrypt.hash(password, 12);

    const result = await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${username}, ${hash})
      ON CONFLICT (username) DO UPDATE
      SET password_hash = EXCLUDED.password_hash
      RETURNING id, username
    `;

    displayCredentials(username, password);

    console.log('✨ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

main();
