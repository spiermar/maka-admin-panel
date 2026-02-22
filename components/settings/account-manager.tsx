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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Account } from '@/lib/db/types';
import {
  createAccount,
  updateAccount,
  deleteAccount,
} from '@/lib/actions/accounts';

interface AccountManagerProps {
  accounts: Account[];
}

export function AccountManager({ accounts }: AccountManagerProps) {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleSubmit = async (formData: FormData) => {
    if (editingAccount) {
      await updateAccount(editingAccount.id, formData);
    } else {
      await createAccount(formData);
    }
    setDialogOpen(false);
    setEditingAccount(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteAccountConfirm'))) {
      return;
    }
    const result = await deleteAccount(id);
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('accounts')}</CardTitle>
        <Button
          onClick={() => {
            setEditingAccount(null);
            setDialogOpen(true);
          }}
        >
          {t('addAccount')}
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('name')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>{account.name}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingAccount(account);
                      setDialogOpen(true);
                    }}
                  >
                    {t('edit')}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                  >
                    {t('delete')}
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
                {editingAccount ? t('editAccount') : t('addAccount')}
              </DialogTitle>
              <DialogDescription>
                {editingAccount
                  ? t('updateAccount')
                  : t('createAccount')}
              </DialogDescription>
            </DialogHeader>

            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('accountName')}</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingAccount?.name}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingAccount ? t('update') : t('create')}
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
