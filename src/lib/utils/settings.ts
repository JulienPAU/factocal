import { browser } from "$app/environment";
import { writable } from "svelte/store";

// Type pour les paramètres de l'application
interface AppSettings {
  language: string;
  currency: string;
  taxDefaultRate: number;
  useAutoNumbering: boolean;
  defaultDueDays: number;
  prefixFacture?: string; // Préfixe pour les numéros de facture
  prefixDevis?: string; // Préfixe pour les numéros de devis
  includeMonth?: boolean; // Inclure le mois dans les numéros de document
}

// Clé de stockage pour les paramètres
const SETTINGS_STORAGE_KEY = "app_settings";

// Paramètres par défaut
const DEFAULT_SETTINGS: AppSettings = {
  language: "fr",
  currency: "EUR",
  taxDefaultRate: 20,
  useAutoNumbering: true,
  defaultDueDays: 30,
  prefixFacture: "FAC",
  prefixDevis: "DEV",
  includeMonth: true
};

// Store pour les paramètres
export const settingsStore = writable<AppSettings>(DEFAULT_SETTINGS);

// Initialiser les paramètres
export const initSettings = (): void => {
  if (!browser) return;

  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      settingsStore.set(settings);
    } else {
      // Si pas de paramètres stockés, initialiser avec les valeurs par défaut
      saveSettings(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des paramètres:", error);
  }
};

// Sauvegarder les paramètres
export const saveSettings = (settings: AppSettings): void => {
  if (!browser) return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    settingsStore.set(settings);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des paramètres:", error);
  }
};

// Récupérer les paramètres
export const getAppSettings = (): AppSettings => {
  if (!browser) return DEFAULT_SETTINGS;

  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      return JSON.parse(storedSettings);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des paramètres:", error);
  }

  return DEFAULT_SETTINGS;
};
