#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const bcrypt = require('bcrypt');
const { sql } = require('@vercel/postgres');

function generateRandomPassword() {
  const crypto = require('crypto');
  const randomBytes = crypto.randomBytes(12);
  const base64 = randomBytes.toString('base64');
  const alphanumeric = base64.replace(/[^a-zA-Z0-9]/g, '');
  return alphanumeric.substring(0, 16);
}

async function promptPassword() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question('Enter new admin password (leave blank for random): ', answer => {
      rl.close();
      resolve(answer || generateRandomPassword());
    });
  });
}

async function resetAdminPassword() {
  try {
    let newPassword = process.argv[2];

    if (!newPassword) {
      newPassword = await promptPassword();
    }

    if (newPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    const hash = await bcrypt.hash(newPassword, 12);

    const result = await sql`
      UPDATE users
      SET password_hash = ${hash}
      WHERE username = 'admin'
      RETURNING id, username
    `;

    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully');
      console.log('Username: admin');
      console.log('Password:', newPassword);
      console.log('\n⚠️  Store this password securely!');
    } else {
      console.log('❌ Admin user not found');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

resetAdminPassword();
