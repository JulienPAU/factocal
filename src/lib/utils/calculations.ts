import type { Invoice } from "$lib/types/invoice";
import { calculateSubtotal, calculateDiscount } from "$lib/types/invoice";

/**
 * Calcule le total hors taxe d'une facture (après remise)
 */
export const calculateTotalWithoutTax = (invoice: Invoice): number => {
  const subtotal = calculateSubtotal(invoice.items);
  const discount = invoice.discount
    ? calculateDiscount(invoice.items, invoice.discount)
    : 0;
  return subtotal - discount;
};
