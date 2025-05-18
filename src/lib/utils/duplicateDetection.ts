import type { Invoice } from "../types/invoice";

export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  const cleanStr1 = str1.toLowerCase().trim();
  const cleanStr2 = str2.toLowerCase().trim();

  if (cleanStr1 === cleanStr2) return 1;

  const len1 = cleanStr1.length;
  const len2 = cleanStr2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(cleanStr1, cleanStr2);
  return 1 - distance / maxLen;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    d[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  return d[m][n];
}

function amountSimilarity(amount1: number, amount2: number): boolean {
  if (amount1 === 0 && amount2 === 0) return true;
  if (amount1 === 0 || amount2 === 0) return false;

  const diff = Math.abs(amount1 - amount2);
  const max = Math.max(amount1, amount2);

  return diff / max <= 0.1;
}

export function findDuplicates(
  source: Invoice,
  existingInvoices: Invoice[]
): { source: Invoice; similarTo: Invoice }[] {
  const duplicates: { source: Invoice; similarTo: Invoice }[] = [];

  const sourceTotal = source.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  for (const existing of existingInvoices) {
    if (existing.id === source.id) continue;

    const clientSimilarity = stringSimilarity(
      source.client?.name || "",
      existing.client?.name || ""
    );

    const existingTotal = existing.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const totalSimilar = amountSimilarity(sourceTotal, existingTotal);

    const sameNumber = source.documentNumber === existing.documentNumber;

    if ((clientSimilarity > 0.7 && totalSimilar) || sameNumber) {
      duplicates.push({
        source,
        similarTo: existing
      });
    }
  }

  return duplicates;
}
