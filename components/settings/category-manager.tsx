'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CategoryWithPath } from '@/lib/db/types';
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/actions/categories';

interface CategoryManagerProps {
  categories: CategoryWithPath[];
}

export function CategoryManager({ categories }: CategoryManagerProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithPath | null>(
    null
  );

  const handleSubmit = async (formData: FormData) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, formData);
    } else {
      await createCategory(formData);
    }
    setDialogOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = async (id: number) => {
    if (
      !confirm(t('deleteCategoryConfirm'))
    ) {
      return;
    }
    await deleteCategory(id);
  };

  const validParents = categories.filter((c) => c.depth < 3);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('categories')}</CardTitle>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setDialogOpen(true);
          }}
        >
          {t('addCategory')}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('categoryType')}</TableHead>
              <TableHead>{t('depth')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <span style={{ paddingLeft: `${(category.depth - 1) * 20}px` }}>
                    {category.path}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs ${
                      category.category_type === 'income'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {t(category.category_type)}
                  </span>
                </TableCell>
                <TableCell>{category.depth}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(category);
                      setDialogOpen(true);
                    }}
                  >
                    {tCommon('edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(category.id)}
                  >
                    {tCommon('delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? t('editCategory') : t('addCategory')}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? t('updateCategory')
                  : t('createCategory')}
              </DialogDescription>
            </DialogHeader>

            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('categoryName')}</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingCategory?.name}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_type">{t('categoryType')}</Label>
                <Select
                  name="category_type"
                  defaultValue={editingCategory?.category_type || 'expense'}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">{t('income')}</SelectItem>
                    <SelectItem value="expense">{t('expense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_id">{t('parentCategory')}</Label>
                <Select
                  name="parent_id"
                  defaultValue={editingCategory?.parent_id?.toString() || 'none'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('noneRootCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('noneRootCategory')}</SelectItem>
                    {validParents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        {parent.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingCategory ? t('update') : t('create')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  {tCommon('cancel')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
