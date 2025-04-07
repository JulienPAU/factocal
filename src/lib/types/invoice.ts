export type DocumentType = "facture" | "devis";

export interface Client {
  name: string;
  address: string;
  email: string;
  phone?: string;
}

export interface Item {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Provider {
  name: string;
  address: string;
  email: string;
  phone?: string;
  siret: string;
  tvaNumber?: string;
  acceptedPayments?: string; // Modes de paiement acceptés
  memberAga?: boolean; // Membre d'une association de gestion agréée
}

export interface Invoice {
  id: string;
  documentNumber: string;
  documentType: DocumentType;
  issueDate: string;
  dueDate: string;
  client: Client;
  provider: Provider;
  items: Item[];
  taxRate: number;
  discount?: number;
  advancePayment?: number;
  notes?: string;
  totalAmount?: number;

  // Pour la conversion devis -> facture
  quotationId?: string;
  convertedToInvoice?: boolean;
  paymentMethod?: string; // Mode de paiement
}

// Utilitaires pour calculer les totaux
export const calculateSubtotal = (items: Item[]): number => {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
};

export const calculateDiscount = (items: Item[], discountPercentage = 0) => {
  if (!discountPercentage || discountPercentage <= 0) return 0;
  const subtotal = calculateSubtotal(items);
  return subtotal * (discountPercentage / 100);
};

export const calculateTax = (
  items: Item[],
  taxRate: number,
  discountPercentage = 0
) => {
  if (!taxRate || taxRate <= 0) return 0;
  const subtotal = calculateSubtotal(items);
  const discount = calculateDiscount(items, discountPercentage);
  return (subtotal - discount) * (taxRate / 100);
};

export const calculateAdvancePayment = (
  items: Item[],
  advancePaymentAmount = 0
) => {
  if (!advancePaymentAmount || advancePaymentAmount <= 0) return 0;
  // L'accompte est un montant fixe, non un pourcentage
  return advancePaymentAmount;
};

export const calculateTotal = (
  items: Item[],
  taxRate: number,
  discountPercentage = 0,
  advancePaymentAmount = 0
) => {
  const subtotal = calculateSubtotal(items);
  const discount = calculateDiscount(items, discountPercentage);
  const tax = calculateTax(items, taxRate, discountPercentage);
  const advancePayment = calculateAdvancePayment(items, advancePaymentAmount);
  return subtotal - discount + tax - advancePayment;
};
