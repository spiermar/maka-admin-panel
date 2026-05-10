import { beforeEach, describe, expect, it, vi } from 'vitest';
import { notFound, redirect } from 'next/navigation';
import { getAccountById } from '@/lib/db/accounts';
import AccountDetailPage from '@/app/(dashboard)/accounts/[id]/page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

vi.mock('@/lib/db/accounts', () => ({
  getAccountById: vi.fn(),
}));

describe('Account detail redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('404s out-of-range account IDs before database lookup', async () => {
    await expect(
      AccountDetailPage({
        params: Promise.resolve({ id: '2147483648' }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalled();
    expect(getAccountById).not.toHaveBeenCalled();
  });

  it('preserves the first supported lang value when redirecting', async () => {
    vi.mocked(getAccountById).mockResolvedValue({
      id: 7,
      name: 'Checking',
      created_at: new Date(),
    });

    await expect(
      AccountDetailPage({
        params: Promise.resolve({ id: '7' }),
        searchParams: Promise.resolve({ lang: ['pt-BR', 'en'] }),
      })
    ).rejects.toThrow('NEXT_REDIRECT: /transactions?accountId=7&lang=pt-BR');

    expect(redirect).toHaveBeenCalledWith('/transactions?accountId=7&lang=pt-BR');
  });

  it('omits unsupported lang values when redirecting', async () => {
    vi.mocked(getAccountById).mockResolvedValue({
      id: 8,
      name: 'Savings',
      created_at: new Date(),
    });

    await expect(
      AccountDetailPage({
        params: Promise.resolve({ id: '8' }),
        searchParams: Promise.resolve({ lang: 'fr' }),
      })
    ).rejects.toThrow('NEXT_REDIRECT: /transactions?accountId=8');

    expect(redirect).toHaveBeenCalledWith('/transactions?accountId=8');
  });
});
