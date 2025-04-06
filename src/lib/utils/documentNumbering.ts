import { loadInvoices } from "./storage";

/**
 * Générer un numéro de document au format TYPE-ANNÉE-MOIS-SÉQUENCE
 * @param type Type de document ('facture' ou 'devis')
 * @returns Numéro de document formaté (ex: FAC-2025-04-001)
 */
export const generateDocumentNumber = (type: "facture" | "devis"): string => {
  // Obtenir la date courante
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // Les mois commencent à 0, donc +1

  // Formater le mois avec un zéro devant si nécessaire (01, 02, etc.)
  const monthStr = month.toString().padStart(2, "0");

  // Préfixe selon le type
  const prefix = type === "facture" ? "FAC" : "DEV";

  // Charger toutes les factures pour trouver le dernier numéro
  const invoices = loadInvoices();

  // Filtrer par type, année et mois
  const relevantInvoices = invoices.filter(
    (inv) =>
      inv.documentType === type &&
      inv.documentNumber.startsWith(`${prefix}-${year}-${monthStr}`)
  );

  // Trouver le dernier numéro séquentiel
  let maxSequence = 0;

  for (const invoice of relevantInvoices) {
    // Format attendu: PREFIX-YEAR-MONTH-SEQUENCE
    const parts = invoice.documentNumber.split("-");
    if (parts.length === 4) {
      const sequence = Number.parseInt(parts[3], 10);
      if (!Number.isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  }

  // Incrémenter pour le prochain document
  const nextSequence = maxSequence + 1;

  // Formater avec des zéros (ex: 001, 012, 123)
  const sequenceStr = nextSequence.toString().padStart(3, "0");

  // Créer le numéro final
  return `${prefix}-${year}-${monthStr}-${sequenceStr}`;
};

/**
 * Extraire le numéro de séquence d'un numéro de document
 * Utile pour trier ou afficher les documents
 */
export const extractSequenceNumber = (documentNumber: string): number => {
  const parts = documentNumber.split("-");
  if (parts.length === 4) {
    return Number.parseInt(parts[3], 10);
  }
  return 0;
};

/**
 * Obtenir un numéro de document formaté pour l'affichage
 */
export const formatDocumentNumber = (documentNumber: string): string => {
  // Si c'est déjà au nouveau format, le retourner tel quel
  if (/^(FAC|DEV)-\d{4}-\d{1,3}-\d{3}$/.test(documentNumber)) {
    return documentNumber;
  }

  // Sinon, c'est un ancien format ou un format inconnu, le retourner tel quel
  return documentNumber;
};
