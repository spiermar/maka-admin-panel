import { parse as parseOfx } from 'ofx-parser';
import { ParsedOfxImport, OfxTransaction } from './types';

function parseOfxDate(dateStr: string | Date): string {
  const dateString = dateStr instanceof Date ? dateStr.toISOString() : String(dateStr);
  const match = dateString.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    throw new Error(`Invalid OFX date format: ${dateString}`);
  }
  const [, year, month, day] = match;
  return `${year}-${month}-${day}`;
}

function parseAmount(amountStr: string | number): number {
  return typeof amountStr === 'number' ? amountStr : parseFloat(amountStr);
}

function getOfxValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export async function parseOfxFile(content: string): Promise<ParsedOfxImport> {
  const ofx = await parseOfx(content);

  const bankMsgs = getOfxValue(ofx.OFX, 'BANKMSGSRSV1.STMTTRNRS.STMTRS') as Record<string, unknown> | undefined;
  
  if (!bankMsgs) {
    throw new Error('No statement found in OFX file');
  }

  const bankAcctFrom = getOfxValue(bankMsgs, 'BANKACCTFROM') as Record<string, string> | undefined;
  const stmt = getOfxValue(bankMsgs, 'BANKTRANLIST.STMTTRN') as unknown[];
  const dateRange = getOfxValue(bankMsgs, 'BANKTRANLIST') as Record<string, string> | undefined;

  const transactions: OfxTransaction[] = (Array.isArray(stmt) ? stmt : stmt ? [stmt] : []).map(
    (tx: unknown) => {
      const txObj = tx as Record<string, unknown>;
      const fitid = String(txObj.TRNTYPE || '');
      const trnType = String(txObj.TRNTYPE || 'DEBIT');
      const id = String(txObj.FITID || '');
      
      const lastDashIndex = id.lastIndexOf('-');
      const cleanFitid = lastDashIndex > 0 ? id.substring(0, lastDashIndex) : id;

      const amount = parseAmount(txObj.TRNAMT as string | number);
      const refnum = String(txObj.REFNUM || cleanFitid);
      const memo = String(txObj.MEMO || '');

      return {
        fitid: cleanFitid,
        refnum,
        memo,
        date: parseOfxDate(txObj.DTPOSTED as string | Date),
        amount,
        type: trnType.toUpperCase() === 'CREDIT' ? 'CREDIT' : 'DEBIT',
      };
    }
  );

  return {
    account: {
      bankId: bankAcctFrom?.BANKID || '',
      accountId: bankAcctFrom?.ACCTID || '',
      type: bankAcctFrom?.ACCTTYPE || 'CHECKING',
    },
    dateRange: {
      start: dateRange?.DTSTART ? parseOfxDate(dateRange.DTSTART) : '',
      end: dateRange?.DTEND ? parseOfxDate(dateRange.DTEND) : '',
    },
    transactions,
  };
}