import { queryMany, queryOne } from './index';
import { Category } from './types';

export async function getAllCategories(): Promise<Category[]> {
  return queryMany<Category>(
    `SELECT * FROM categories ORDER BY category_type, depth, name ASC`
  );
}

export async function getCategoryById(id: number): Promise<Category | null> {
  return queryOne<Category>(
    'SELECT * FROM categories WHERE id = $1',
    [id]
  );
}

export interface CategoryWithPath extends Category {
  path: string;
}

export async function getAllCategoriesWithPaths(): Promise<CategoryWithPath[]> {
  // Recursive CTE to build full category paths
  return queryMany<CategoryWithPath>(
    `WITH RECURSIVE category_path AS (
       -- Base case: root categories
       SELECT
         id,
         name,
         parent_id,
         category_type,
         depth,
         created_at,
         name::varchar as path
       FROM categories
       WHERE parent_id IS NULL

       UNION ALL

       -- Recursive case: children
       SELECT
         c.id,
         c.name,
         c.parent_id,
         c.category_type,
         c.depth,
         c.created_at,
         cp.path || ' > ' || c.name as path
       FROM categories c
       INNER JOIN category_path cp ON c.parent_id = cp.id
     )
     SELECT * FROM category_path
     ORDER BY category_type, path ASC`
  );
}

export async function getCategoryDepth(categoryId: number | null): Promise<number> {
  if (!categoryId) return 0;

  const category = await getCategoryById(categoryId);
  return category?.depth || 0;
}
