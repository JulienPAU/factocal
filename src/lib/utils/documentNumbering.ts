/**
 * Module de gestion de la numérotation des documents (factures et devis)
 * Génère des numéros séquentiels basés sur le type de document, l'année et le mois
 * Format: [Type]-[Année]-[Mois]-[Séquence]
 */

import { browser } from "$app/environment";
import { get } from "svelte/store";
import { settingsStore } from "./settings";
import type { Invoice } from "$lib/types/invoice";

type DocumentType = "facture" | "devis";
type CounterMap = Record<string, number>;

const STORAGE_KEY = "document_counters";
const DEFAULT_PREFIX_FACTURE = "FAC";
const DEFAULT_PREFIX_DEVIS = "DEV";

function getDocPrefix(type: DocumentType): string {
  if (!browser)
    return type === "facture" ? DEFAULT_PREFIX_FACTURE : DEFAULT_PREFIX_DEVIS;

  const settings = get(settingsStore);

  if (type === "facture") {
    return settings.prefixFacture || DEFAULT_PREFIX_FACTURE;
  }

  return settings.prefixDevis || DEFAULT_PREFIX_DEVIS;
}

function getCounters(): CounterMap {
  if (!browser) return {};

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Erreur lors du chargement des compteurs:", error);
    return {};
  }
}

function saveCounters(counters: CounterMap): void {
  if (!browser) return;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
}

function resetCounters(): void {
  if (!browser) return;

  saveCounters({});
}

function getCurrentCounter(
  prefix: string,
  year: number,
  month: number
): number {
  const counters = getCounters();
  const key = `${prefix}-${year}-${month}`;
  return counters[key] || 0;
}

function incrementCounter(prefix: string, year: number, month: number): number {
  const counters = getCounters();
  const key = `${prefix}-${year}-${month}`;

  const nextValue = (counters[key] || 0) + 1;
  counters[key] = nextValue;

  saveCounters(counters);
  return nextValue;
}

export function generateDocumentNumber(type: DocumentType): string {
  const prefix = getDocPrefix(type);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const settings = get(settingsStore);
  const paddedMonth =
    settings.includeMonth !== false ? String(month).padStart(2, "0") : "";

  const sequence = incrementCounter(prefix, year, month);
  const paddedSequence = String(sequence).padStart(3, "0");

  if (settings.includeMonth !== false) {
    return `${prefix}-${year}-${paddedMonth}-${paddedSequence}`;
  }

  return `${prefix}-${year}-${paddedSequence}`;
}

export function checkDocumentNumberExistence(documentNumber: string): boolean {
  if (!browser) return false;

  try {
    const data = localStorage.getItem("invoices_data");
    if (!data) return false;

    const invoices = JSON.parse(data) as Invoice[];
    return invoices.some(
      (invoice) => invoice.documentNumber === documentNumber
    );
  } catch (error) {
    console.error(
      "Erreur lors de la vérification du numéro de document:",
      error
    );
    return false;
  }
}

export function getLastDocumentNumber(type: DocumentType): string {
  const prefix = getDocPrefix(type);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const currentCounter = getCurrentCounter(prefix, year, month);
  const paddedCounter = String(currentCounter).padStart(3, "0");

  const settings = get(settingsStore);
  const paddedMonth =
    settings.includeMonth !== false ? String(month).padStart(2, "0") : "";

  if (settings.includeMonth !== false) {
    return `${prefix}-${year}-${paddedMonth}-${paddedCounter}`;
  }

  return `${prefix}-${year}-${paddedCounter}`;
}

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

  return documentNumber;
};
