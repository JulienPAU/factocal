/**
 * Formate une date au format français
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch (error) {
    return dateString;
  }
};

/**
 * Formate un montant monétaire
 */
export const formatMoney = (amount: number): string => {
  return `${amount.toFixed(2)} €`;
};
