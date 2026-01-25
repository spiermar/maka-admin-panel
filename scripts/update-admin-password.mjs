#!/usr/bin/env node

import { sql } from '@vercel/postgres';

// New hash for 'admin123' - verified to work
const ADMIN_HASH = '$2b$12$33IAwrMlVq40YQ3xN.sf4.BvKPHmM8Dx/.XLCryjf/ONDw7cDOfGq';

async function updateAdminPassword() {
  try {
    console.log('Updating admin user password...');

    const result = await sql`
      UPDATE users
      SET password_hash = ${ADMIN_HASH}
      WHERE username = 'admin'
      RETURNING id, username
    `;

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('   Username:', result.rows[0].username);
      console.log('   User ID:', result.rows[0].id);
      console.log('\nYou can now login with:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    } else {
      console.log('❌ Admin user not found in database');
      console.log('   Please run: npm run db:seed');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateAdminPassword();
