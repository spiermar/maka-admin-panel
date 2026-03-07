import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRental } from '@/lib/actions/rentals';
import { requireAuth } from '@/lib/auth/session';

vi.mock('@/lib/auth/session', () => ({
  requireAuth: vi.fn(),
}));

describe('Rental Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks unauthenticated createRental calls via auth redirect outcome', async () => {
    vi.mocked(requireAuth).mockRejectedValue(new Error('NEXT_REDIRECT: /login'));
    const formData = new FormData();

    await expect(createRental(formData)).rejects.toThrow('NEXT_REDIRECT: /login');
    expect(requireAuth).toHaveBeenCalledTimes(1);
  });

  it('allows authenticated createRental calls to proceed to post-auth branch', async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      userId: 1,
      username: 'admin',
      sessionVersion: 1,
    });

    const formData = new FormData();
    formData.append('property_name', 'Main Property');
    formData.append('unit_name', 'Unit 101');

    const result = await createRental(formData);

    expect(requireAuth).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: false,
      error: 'Rental creation will be enabled in a later phase',
    });
  });
});
