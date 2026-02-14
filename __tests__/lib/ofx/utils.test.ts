import { describe, it, expect } from 'vitest';
import { extractPayeeFromMemo } from '@/lib/ofx/utils';

describe('extractPayeeFromMemo', () => {
  it('should extract payee after CNPJ (14 digits)', () => {
    const memo = 'PAG*12345678901234AMAZON SERVICOS';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBe('AMAZON SERVICOS');
    expect(result.cleanedMemo).toBe('PAG*');
  });

  it('should extract payee after CPF (11 digits)', () => {
    const memo = 'PAG*12345678901STORE NAME';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBe('STORE NAME');
    expect(result.cleanedMemo).toBe('PAG*');
  });

  it('should return null payee when no CNPJ/CPF found', () => {
    const memo = 'PAG*SIMPLE DESCRIPTION';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe('PAG*SIMPLE DESCRIPTION');
  });

  it('should use last occurrence when multiple numbers exist', () => {
    const memo = 'PAG*1234567890112345678901FINAL PAYEE';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBe('FINAL PAYEE');
    expect(result.cleanedMemo).toBe('PAG*12345678901');
  });

  it('should return null payee when number is at end', () => {
    const memo = 'PAG*12345678901234';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe('PAG*');
  });

  it('should handle empty memo', () => {
    const memo = '';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe('');
  });

  it('should handle memo with only numbers', () => {
    const memo = '12345678901234';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe('');
  });

  it('should trim whitespace from results', () => {
    const memo = 'PAG*12345678901  PAYEE NAME  ';
    const result = extractPayeeFromMemo(memo);
    
    expect(result.payee).toBe('PAYEE NAME');
    expect(result.cleanedMemo).toBe('PAG*');
  });
});