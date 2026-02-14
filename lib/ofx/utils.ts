export interface PayeeExtractionResult {
  payee: string | null;
  cleanedMemo: string;
}

export function extractPayeeFromMemo(memo: string): PayeeExtractionResult {
  const cpfRegex = /\d{11}/g;
  const cnpjRegex = /\d{14}/g;

  const allMatches: { value: string; index: number; length: number }[] = [];

  let match;
  while ((match = cpfRegex.exec(memo)) !== null) {
    allMatches.push({ value: match[0], index: match.index, length: 11 });
    if (match.index === cpfRegex.lastIndex) cpfRegex.lastIndex++;
  }

  while ((match = cnpjRegex.exec(memo)) !== null) {
    allMatches.push({ value: match[0], index: match.index, length: 14 });
    if (match.index === cnpjRegex.lastIndex) cnpjRegex.lastIndex++;
  }

  if (allMatches.length === 0) {
    return { payee: null, cleanedMemo: memo };
  }

  allMatches.sort((a, b) => {
    const endA = a.index + a.length;
    const endB = b.index + b.length;
    return endA - endB;
  });

  const lastMatch = allMatches[allMatches.length - 1];
  const lastMatchIndex = lastMatch.index;

  const beforeNumber = memo.substring(0, lastMatchIndex).trim();
  const afterNumber = memo.substring(lastMatchIndex + lastMatch.length).trim();

  if (!afterNumber) {
    return { payee: null, cleanedMemo: beforeNumber };
  }

  return {
    payee: afterNumber,
    cleanedMemo: beforeNumber,
  };
}