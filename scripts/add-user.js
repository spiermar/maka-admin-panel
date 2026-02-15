#!/usr/bin/env node

import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { sql } from '@vercel/postgres';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

async function promptInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

async function addUser() {
  try {
    const username = process.argv[2];
    const password = process.argv[3];

    let finalUsername = username;
    let finalPassword = password;

    if (!finalUsername) {
      finalUsername = await promptInput('Enter username: ');
    }

    if (!finalPassword) {
      finalPassword = await promptInput('Enter password: ');
    }

    if (!finalUsername || !finalPassword) {
      console.error('❌ Username and password are required');
      process.exit(1);
    }

    if (finalUsername.length < 3) {
      console.error('❌ Username must be at least 3 characters');
      process.exit(1);
    }

    if (finalPassword.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${finalUsername}
    `;

    if (existingUser.rows.length > 0) {
      console.error(`❌ User "${finalUsername}" already exists`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(finalPassword, 12);

    const result = await sql`
      INSERT INTO users (username, password_hash)
      VALUES (${finalUsername}, ${hash})
      RETURNING id, username
    `;

    if (result.rows.length > 0) {
      console.log('✅ User created successfully');
      console.log('Username:', result.rows[0].username);
      console.log('User ID:', result.rows[0].id);
    } else {
      console.error('❌ Failed to create user');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

addUser();