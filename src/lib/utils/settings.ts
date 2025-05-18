import { browser } from "$app/environment";
import { writable } from "svelte/store";

interface AppSettings {
  language: string;
  currency: string;
  taxDefaultRate: number;
  useAutoNumbering: boolean;
  defaultDueDays: number;
  prefixFacture?: string;
  prefixDevis?: string;
  includeMonth?: boolean;
}

const SETTINGS_STORAGE_KEY = "app_settings";

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

export const settingsStore = writable<AppSettings>(DEFAULT_SETTINGS);

export const initSettings = (): void => {
  if (!browser) return;

  try {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (storedSettings) {
      const settings = JSON.parse(storedSettings);
      settingsStore.set(settings);
    } else {
      saveSettings(DEFAULT_SETTINGS);
    }
  } catch (error) {
    console.error("Erreur lors du chargement des paramètres:", error);
  }
};

export const saveSettings = (settings: AppSettings): void => {
  if (!browser) return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    settingsStore.set(settings);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des paramètres:", error);
  }
};

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
