import { browser } from "$app/environment";
import { writable } from "svelte/store";

const LOGO_STORAGE_KEY = "company_logo";

export const logoStore = writable<string | null>(null);

export const initLogoStore = (): void => {
  if (!browser) return;

  try {
    const storedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
    if (storedLogo) {
      logoStore.set(storedLogo);
    }
  } catch (error) {
    console.error("Erreur lors du chargement du logo :", error);
  }
};

export const saveLogo = (logoBase64: string): void => {
  if (!browser) return;

  try {
    localStorage.setItem(LOGO_STORAGE_KEY, logoBase64);
    logoStore.set(logoBase64);
  } catch (error) {
    console.error("Erreur lors de la sauvegarde du logo :", error);
    throw new Error(
      "Impossible de sauvegarder le logo. Vérifiez l'espace de stockage disponible."
    );
  }
};

export const removeLogo = (): void => {
  if (!browser) return;

  try {
    localStorage.removeItem(LOGO_STORAGE_KEY);
    logoStore.set(null);
  } catch (error) {
    console.error("Erreur lors de la suppression du logo :", error);
  }
};

export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Impossible de convertir l'image en base64"));
      }
    };

    reader.onerror = () => {
      reject(new Error("Erreur lors de la lecture du fichier"));
    };

    reader.readAsDataURL(file);
  });
};

export const validateImage = (file: File): boolean => {
  const validTypes = [
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/gif",
    "image/webp"
  ];
  if (!validTypes.includes(file.type)) {
    throw new Error(
      "Format d'image non supporté. Utilisez JPG, PNG, SVG, GIF ou WEBP."
    );
  }

  const maxSizeInBytes = 500 * 1024;
  if (file.size > maxSizeInBytes) {
    throw new Error(
      "L'image est trop volumineuse. La taille maximale est de 500KB."
    );
  }

  return true;
};
