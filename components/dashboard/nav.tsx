'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function DashboardNav() {
  const t = useTranslations('nav');
  const searchParams = useSearchParams();
  const lang = searchParams.get('lang') || 'en';
  const [rentalsOpen, setRentalsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setRentalsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { href: `/?lang=${lang}`, label: t('dashboard') },
    { href: `/accounts?lang=${lang}`, label: t('accounts') },
  ];

  const rentalsLinks = [
    { href: `/rentals?lang=${lang}`, label: t('rentals') },
    { href: `/rentals/tenants?lang=${lang}`, label: t('tenants') },
    { href: `/rentals/leases?lang=${lang}`, label: t('leases') },
    { href: `/rentals/charges?lang=${lang}`, label: t('charges') },
    { href: `/rentals/payments?lang=${lang}`, label: t('payments') },
    { href: `/rentals/overdue?lang=${lang}`, label: t('overdue') },
    { href: `/rentals/audit?lang=${lang}`, label: t('audit') },
  ];

  const otherLinks = [
    { href: `/expense-reports?lang=${lang}`, label: t('expenseReports') },
    { href: `/settings?lang=${lang}`, label: t('settings') },
  ];

  return (
    <nav className="border-b bg-muted/40">
      <div className="container mx-auto px-4 py-2">
        <div className="flex gap-2">
          {navLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRentalsOpen(!rentalsOpen)}
              className="focus:outline-none"
            >
              {t('rentals')}
            </Button>
            {rentalsOpen && (
              <div className="absolute left-0 top-full mt-1 min-w-[180px] z-50 rounded-md border bg-background shadow-lg">
                {rentalsLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2 text-sm hover:bg-accent"
                    onClick={() => setRentalsOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {otherLinks.map((link) => (
            <Button key={link.href} variant="ghost" size="sm" asChild>
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </nav>
  );
}
