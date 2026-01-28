'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth/session';
import { execute, executeReturning } from '@/lib/db';
import { getCategoryDepth } from '@/lib/db/categories';
import { Category } from '@/lib/db/types';
import { categorySchema } from '@/lib/validations/categories';

export async function createCategory(formData: FormData) {
  await requireAuth();

  const parentIdRaw = formData.get('parent_id');
  const parentId = parentIdRaw === 'none' || !parentIdRaw ? null : parentIdRaw;

  const result = categorySchema.safeParse({
    name: formData.get('name'),
    category_type: formData.get('category_type'),
    parent_id: parentId,
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, category_type, parent_id } = result.data;

  try {
    // Calculate depth
    const parentDepth = await getCategoryDepth(parent_id || null);
    const depth = parentDepth + 1;

    if (depth > 3) {
      return {
        success: false,
        error: 'Maximum category depth is 3',
      };
    }

    await executeReturning<Category>(
      `INSERT INTO categories (name, category_type, parent_id, depth)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name, category_type, parent_id, depth]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to create category:', error);
    return {
      success: false,
      error: 'Failed to create category',
    };
  }
}

export async function updateCategory(id: number, formData: FormData) {
  await requireAuth();

  const parentIdRaw = formData.get('parent_id');
  const parentId = parentIdRaw === 'none' || !parentIdRaw ? null : parentIdRaw;

  const result = categorySchema.safeParse({
    name: formData.get('name'),
    category_type: formData.get('category_type'),
    parent_id: parentId,
  });

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, category_type, parent_id } = result.data;

  try {
    // Calculate new depth
    const parentDepth = await getCategoryDepth(parent_id || null);
    const depth = parentDepth + 1;

    if (depth > 3) {
      return {
        success: false,
        error: 'Maximum category depth is 3',
      };
    }

    await execute(
      `UPDATE categories
       SET name = $1, category_type = $2, parent_id = $3, depth = $4
       WHERE id = $5`,
      [name, category_type, parent_id, depth, id]
    );

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to update category:', error);
    return {
      success: false,
      error: 'Failed to update category',
    };
  }
}

export async function deleteCategory(id: number) {
  await requireAuth();

  try {
    // Cascade deletion handled by database
    await execute('DELETE FROM categories WHERE id = $1', [id]);

    revalidatePath('/');
    revalidatePath('/settings');

    return { success: true };
  } catch (error) {
    console.error('Failed to delete category:', error);
    return {
      success: false,
      error: 'Failed to delete category',
    };
  }
}
