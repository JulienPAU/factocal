import type { Invoice } from "../types/invoice";

/**
 * Évalue si deux chaînes de caractères sont similaires à au moins 70%
 */
export function stringSimilarity(str1: string, str2: string): number {
  if (!str1 && !str2) return 1;
  if (!str1 || !str2) return 0;

  const cleanStr1 = str1.toLowerCase().trim();
  const cleanStr2 = str2.toLowerCase().trim();

  if (cleanStr1 === cleanStr2) return 1;

  // Algorithme de similarité simple basé sur la distance de Levenshtein
  const len1 = cleanStr1.length;
  const len2 = cleanStr2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(cleanStr1, cleanStr2);
  return 1 - distance / maxLen;
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Matrice pour mémoriser les distances
  const d: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialisation
  for (let i = 0; i <= m; i++) {
    d[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  // Calcul
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // suppression
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return d[m][n];
}

/**
 * Vérifie si un montant est similaire à un autre (à 10% près)
 */
function amountSimilarity(amount1: number, amount2: number): boolean {
  if (amount1 === 0 && amount2 === 0) return true;
  if (amount1 === 0 || amount2 === 0) return false;

  const diff = Math.abs(amount1 - amount2);
  const max = Math.max(amount1, amount2);

  return diff / max <= 0.1; // 10% de tolérance
}

/**
 * Trouve les factures similaires à une facture donnée
 */
export function findDuplicates(
  source: Invoice,
  existingInvoices: Invoice[]
): { source: Invoice; similarTo: Invoice }[] {
  const duplicates: { source: Invoice; similarTo: Invoice }[] = [];

  // Calculer le montant total de la facture source
  const sourceTotal = source.items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  for (const existing of existingInvoices) {
    // Ignorer la facture elle-même (si elle fait partie de la liste)
    if (existing.id === source.id) continue;

    // Vérifier la similarité du client
    const clientSimilarity = stringSimilarity(
      source.client?.name || "",
      existing.client?.name || ""
    );

    // Calculer le montant total de la facture existante
    const existingTotal = existing.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    // Vérifier la similarité des montants
    const totalSimilar = amountSimilarity(sourceTotal, existingTotal);

    // Vérifier si les numéros de document sont identiques
    const sameNumber = source.documentNumber === existing.documentNumber;

    // Si le nom du client est similaire à 70% et le montant est similaire, ou si les numéros de document sont identiques
    if ((clientSimilarity > 0.7 && totalSimilar) || sameNumber) {
      duplicates.push({
        source,
        similarTo: existing
      });
    }
  }

  return duplicates;
}
