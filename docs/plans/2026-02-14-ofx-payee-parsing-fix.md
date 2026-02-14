# OFX Payee Parsing Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix payee parsing in OFX imports to extract payee from MEMO field by finding the last 11 or 14 digit number (CNPJ/CPF) and extracting words after it. Also clean the comment field by removing the number and everything after it (only when payee is successfully parsed).

**Architecture:** Add a utility function `extractPayeeFromMemo(memo: string): string | null` that parses the MEMO field according to the specified rules. Update the OFX import action to use this function.

**Tech Stack:** TypeScript, Vitest for testing

---

## Task 1: Create OFX Payee Extraction Utility

**Files:**
- Create: `lib/ofx/utils.ts`

**Step 1: Create utility file with extractPayeeFromMemo function**

Create `lib/ofx/utils.ts`:

```typescript
const CNPJ_LENGTH = 14;
const CPF_LENGTH = 11;

export interface PayeeExtractionResult {
  payee: string | null;
  cleanedMemo: string;
}

export function extractPayeeFromMemo(memo: string): PayeeExtractionResult {
  const cnpjCpfRegex = /(\d{11}|\d{14})/g;
  const matches = memo.match(cnpjCpfRegex);

  if (!matches || matches.length === 0) {
    return { payee: null, cleanedMemo: memo };
  }

  const lastMatch = matches[matches.length - 1];
  const lastMatchIndex = memo.lastIndexOf(lastMatch);

  const beforeNumber = memo.substring(0, lastMatchIndex).trim();
  const afterNumber = memo.substring(lastMatchIndex + lastMatch.length).trim();

  if (!afterNumber) {
    return { payee: null, cleanedMemo: memo };
  }

  return {
    payee: afterNumber,
    cleanedMemo: beforeNumber,
  };
}
```

**Step 2: Commit**

```bash
git add lib/ofx/utils.ts
git commit -m "feat: add OFX payee extraction utility"
```

---

## Task 2: Add Unit Tests for Payee Extraction

**Files:**
- Create: `__tests__/lib/ofx/utils.test.ts`

**Step 1: Write the test file**

Create `__tests__/lib/ofx/utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { extractPayeeFromMemo } from '@/lib/ofx/utils';

describe('extractPayeeFromMemo', () => {
  it('should return null when no 11 or 14 digit number found', () => {
    const result = extractPayeeFromMemo('IOF BASICO CH PJ-Iof.BAsic');
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe('IOF BASICO CH PJ-Iof.BAsic');
  });

  it('should extract payee after 14-digit CNPJ', () => {
    const memo = 'LIQUIDACAO BOLETO SICREDI-252056533 89281109000158 ESQUEMA CONTAB E REPRESLTDA';
    const result = extractPayeeFromMemo(memo);
    expect(result.payee).toBe('ESQUEMA CONTAB E REPRESLTDA');
    expect(result.cleanedMemo).toBe('LIQUIDACAO BOLETO SICREDI-252056533');
  });

  it('should extract payee after 11-digit CPF', () => {
    const memo = 'PAGAMENTO PIX-PIX_DEB   03622218045 ALEXSANDRO LACERDA SILVA';
    const result = extractPayeeFromMemo(memo);
    expect(result.payee).toBe('ALEXSANDRO LACERDA SILVA');
    expect(result.cleanedMemo).toBe('PAGAMENTO PIX-PIX_DEB');
  });

  it('should return null when nothing follows the number', () => {
    const memo = 'DEP CHEQUE 24H CANAIS-0012CDC37 02067520083';
    const result = extractPayeeFromMemo(memo);
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe(memo);
  });

  it('should use last match when multiple numbers exist', () => {
    const memo = 'DEBITO CONVENIOS-PIC.CAF   ID 30000000000404850 P.M. PICADA CAFE 92871466000180';
    const result = extractPayeeFromMemo(memo);
    expect(result.payee).toBe('P.M. PICADA CAFE');
    expect(result.cleanedMemo).toBe('DEBITO CONVENIOS-PIC.CAF   ID 30000000000404850');
  });

  it('should handle empty memo', () => {
    const result = extractPayeeFromMemo('');
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe('');
  });

  it('should return null for memo with only number', () => {
    const result = extractPayeeFromMemo('12345678901');
    expect(result.payee).toBeNull();
    expect(result.cleanedMemo).toBe('12345678901');
  });

  it('should correctly extract payee for PIX transfer with CNPJ', () => {
    const memo = 'RECEBIMENTO PIX-PIX_CRED  05375291000116 MAKA ADMINISTRACOES LTDA';
    const result = extractPayeeFromMemo(memo);
    expect(result.payee).toBe('MAKA ADMINISTRACOES LTDA');
    expect(result.cleanedMemo).toBe('RECEBIMENTO PIX-PIX_CRED');
  });
});
```

**Step 2: Run tests to verify they pass**

```bash
cd .worktrees/fix-ofx-payee-parsing && npm test -- --run __tests__/lib/ofx/utils.test.ts
```

Expected: All tests pass

**Step 3: Commit**

```bash
git add __tests__/lib/ofx/utils.test.ts
git commit -m "test: add unit tests for payee extraction"
```

---

## Task 3: Verify Lint and TypeScript

**Step 1: Run lint**

```bash
cd .worktrees/fix-ofx-payee-parsing && npm run lint
```

Expected: No errors

**Step 2: Run TypeScript check**

```bash
cd .worktrees/fix-ofx-payee-parsing && npx tsc --noEmit
```

Expected: No errors

**Step 3: Commit any fixes**

```bash
git add . && git commit -m "fix: lint and typecheck fixes"
```

---

## Task 4: Push Branch and Create PR

**Step 1: Push branch**

```bash
cd .worktrees/fix-ofx-payee-parsing && git push -u origin fix/ofx-payee-parsing
```

**Step 2: Create PR**

```bash
gh pr create --title "fix: parse payee from OFX MEMO field" --body "$(cat <<'EOF'
## Summary
- Add `extractPayeeFromMemo` utility to parse payee from MEMO field
- Extract words after the last 11 (CPF) or 14 (CNPJ) digit number
- Clean comment by removing the number and everything after it (only when payee is parsed)
- Return null when no valid CPF/CNPJ found or nothing follows the number
EOF
)"
```

---

## Execution Options

**Plan complete and saved to `docs/plans/2026-02-14-ofx-payee-parsing-fix.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**