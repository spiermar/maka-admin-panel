'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateChargesAction } from '@/lib/actions/rentals';

interface GenerateChargesButtonProps {}

GenerateChargesButton.displayName = 'GenerateChargesButton';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

export function GenerateChargesButton(_props: GenerateChargesButtonProps) {
  const t = useTranslations('rentals');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Default to current month/year
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(now.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));

  const handleGenerate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await generateChargesAction(
        parseInt(selectedYear, 10),
        parseInt(selectedMonth, 10)
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: t('charges.generateSuccess', { count: result.count }),
        });
        // Refresh after short delay
        setTimeout(() => {
          router.refresh();
          setOpen(false);
          setMessage(null);
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: result.error,
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: t('charges.generateError'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate year options (current year and next year)
  const currentYear = now.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{t('charges.generateButton')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('charges.generateTitle')}</DialogTitle>
          <DialogDescription>{t('charges.generateDescription')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">{t('charges.month')}</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder={t('charges.selectMonth')} />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">{t('charges.year')}</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder={t('charges.selectYear')} />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {message && (
            <div
              className={`text-sm ${
                message.type === 'success' ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? t('charges.generating') : t('charges.generateConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}