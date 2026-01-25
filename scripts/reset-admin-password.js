#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcrypt');
const { sql } = require('@vercel/postgres');

async function resetAdminPassword() {
  try {
    // Generate hash for 'admin123'
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 12);

    console.log('Generated hash for "admin123":', hash);

    // Update admin user
    const result = await sql`
      UPDATE users
      SET password_hash = ${hash}
      WHERE username = 'admin'
      RETURNING id, username
    `;

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully');
      console.log('Username:', result.rows[0].username);
      console.log('User ID:', result.rows[0].id);
    } else {
      console.log('❌ Admin user not found. Running seed script...');

      // Insert admin user if doesn't exist
      const insertResult = await sql`
        INSERT INTO users (username, password_hash)
        VALUES ('admin', ${hash})
        RETURNING id, username
      `;

      console.log('✅ Admin user created');
      console.log('Username:', insertResult.rows[0].username);
      console.log('User ID:', insertResult.rows[0].id);
    }

    console.log('\nYou can now login with:');
    console.log('Username: admin');
    console.log('Password: admin123');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

resetAdminPassword();
