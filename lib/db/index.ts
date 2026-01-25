import { sql } from '@vercel/postgres';

export { sql };

// Helper to get a single row or null
export async function queryOne<T>(
  query: string,
  params: any[] = []
): Promise<T | null> {
  const result = await sql.query(query, params);
  return result.rows[0] || null;
}

// Helper to get multiple rows
export async function queryMany<T>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  const result = await sql.query(query, params);
  return result.rows;
}

// Helper for mutations (INSERT, UPDATE, DELETE)
export async function execute(
  query: string,
  params: any[] = []
): Promise<void> {
  await sql.query(query, params);
}

// Helper for mutations that return data (RETURNING clause)
export async function executeReturning<T>(
  query: string,
  params: any[] = []
): Promise<T> {
  const result = await sql.query(query, params);
  return result.rows[0];
}
