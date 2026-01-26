'use server';

import { redirect } from 'next/navigation';
import { queryOne } from '@/lib/db';
import { User } from '@/lib/db/types';
import { getSession } from '@/lib/auth/session';
import { verifyPassword } from '@/lib/auth/password';
import { loginSchema } from '@/lib/validations/auth';

export async function login(prevState: any, formData: FormData) {
  const result = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  if (!result.success) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const { username, password } = result.data;

  const user = await queryOne<User>(
    'SELECT id, username, password_hash, session_version FROM users WHERE username = $1',
    [username]
  );

  if (!user) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  const isValid = await verifyPassword(password, user.password_hash);

  if (!isValid) {
    return {
      success: false,
      error: 'Invalid username or password',
    };
  }

  // Fix session fixation: destroy existing session and create new one
  const oldSession = await getSession();
  await oldSession.destroy();

  // Create fresh session with new session ID
  const session = await getSession();
  session.userId = user.id;
  session.username = user.username;
  session.sessionVersion = user.session_version || 1;
  await session.save();

  return {
    success: true,
  };
}

export async function logout() {
  const session = await getSession();
  session.destroy();
  redirect('/login');
}
