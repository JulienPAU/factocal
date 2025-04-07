/**
 * Utilitaires de validation pour les formulaires de l'application
 * Inclut des fonctions pour valider et formater les numéros spécifiques (SIRET, TVA, téléphone)
 * ainsi que des masques d'entrée pour améliorer l'expérience utilisateur
 */

/**
 * Vérifie si une chaîne contient uniquement des chiffres
 */
export const isNumeric = (value: string): boolean => {
  return /^[0-9]+$/.test(value);
};

/**
 * Vérifie si un numéro de SIRET est valide (14 chiffres)
 */
export const isValidSiret = (siret: string): boolean => {
  const cleanedSiret = siret.replace(/\s/g, "");
  return /^[0-9]{14}$/.test(cleanedSiret);
};

/**
 * Formater un numéro SIRET pour l'affichage
 */
export const formatSiret = (siret: string): string => {
  const cleanedSiret = siret.replace(/\s/g, "");
  if (cleanedSiret.length > 14) return cleanedSiret.slice(0, 14);

  let formattedSiret = cleanedSiret;
  if (cleanedSiret.length >= 9) {
    formattedSiret = `${cleanedSiret.slice(0, 3)} ${cleanedSiret.slice(
      3,
      6
    )} ${cleanedSiret.slice(6, 9)} ${cleanedSiret.slice(9)}`;
  } else if (cleanedSiret.length >= 6) {
    formattedSiret = `${cleanedSiret.slice(0, 3)} ${cleanedSiret.slice(
      3,
      6
    )} ${cleanedSiret.slice(6)}`;
  } else if (cleanedSiret.length >= 3) {
    formattedSiret = `${cleanedSiret.slice(0, 3)} ${cleanedSiret.slice(3)}`;
  }

  return formattedSiret.trim();
};

/**
 * Vérifie si un numéro de téléphone français est valide
 */
export const isValidPhone = (phone: string): boolean => {
  const cleanedPhone = phone.replace(/[\s\-+.]/g, "");
  return /^[0-9]{10,15}$/.test(cleanedPhone);
};

/**
 * Formater un numéro de téléphone pour l'affichage
 */
export const formatPhone = (phone: string): string => {
  const cleanedPhone = phone.replace(/[\s\-+.]/g, "");
  if (cleanedPhone.length > 15) return cleanedPhone.slice(0, 15);

  let formattedPhone = cleanedPhone;

  if (cleanedPhone.startsWith("33") || cleanedPhone.startsWith("+33")) {
    const withoutPrefix = cleanedPhone.startsWith("33")
      ? cleanedPhone.slice(2)
      : cleanedPhone.slice(3);

    formattedPhone = "+33 ";
    for (let i = 0; i < withoutPrefix.length; i += 2) {
      formattedPhone += withoutPrefix.slice(
        i,
        Math.min(i + 2, withoutPrefix.length)
      );
      if (i + 2 < withoutPrefix.length) formattedPhone += " ";
    }
  } else if (cleanedPhone.startsWith("0") && cleanedPhone.length === 10) {
    formattedPhone = cleanedPhone.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
  }

  return formattedPhone;
};

/**
 * Vérifie si un numéro de TVA intracommunautaire est valide
 */
export const isValidVatNumber = (vatNumber: string): boolean => {
  if (vatNumber.startsWith("FR")) {
    return /^FR[0-9]{2}[0-9]{9}$/.test(vatNumber.replace(/\s/g, ""));
  }
  return /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(vatNumber.replace(/\s/g, ""));
};

/**
 * Formater un numéro de TVA pour l'affichage
 */
export const formatVatNumber = (vatNumber: string): string => {
  const cleanedVat = vatNumber.replace(/\s/g, "").toUpperCase();

  if (cleanedVat.length >= 2) {
    const countryCode = cleanedVat.slice(0, 2);
    const rest = cleanedVat.slice(2);

    if (countryCode === "FR" && rest.length > 0) {
      if (rest.length <= 2) {
        return `${countryCode} ${rest}`;
      } else {
        return `${countryCode} ${rest.slice(0, 2)} ${rest.slice(2)}`;
      }
    }

    return `${countryCode} ${rest}`;
  }

  return cleanedVat;
};

/**
 * Applique un masque de validation à un champ input en temps réel
 */
export const applyInputMask = (
  input: HTMLInputElement,
  validator: (value: string) => boolean,
  formatter: (value: string) => string
): void => {
  let lastValidValue = "";

  const handleInput = () => {
    const currentValue = input.value;
    const formattedValue = formatter(currentValue);

    if (validator(formattedValue) || formattedValue === "") {
      lastValidValue = formattedValue;
    }

    if (input.value !== formattedValue) {
      input.value = formattedValue;
      const event = new Event("input", { bubbles: true });
      input.dispatchEvent(event);
    }
  };

  input.addEventListener("input", handleInput);

  return;
};

/**
 * Vérifie si une adresse email est valide
 */
export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Vérifie si une valeur est un nombre positif
 */
export const isPositiveNumber = (value: string): boolean => {
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num >= 0;
};

/**
 * Vérifie si une valeur est un pourcentage valide (0-100)
 */
export const isValidPercentage = (value: string): boolean => {
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num >= 0 && num <= 100;
};

/**
 * Vérifie si un texte contient des caractères invalides pour un document
 */
export const containsInvalidChars = (text: string): boolean => {
  const invalidChars = /[<>"'&]/;
  return invalidChars.test(text);
};

/**
 * Remplace les caractères invalides par des caractères sécurisés
 */
export const sanitizeText = (text: string): string => {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .replace(/&/g, "&amp;");
};
