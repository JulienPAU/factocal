/**
 * Utilitaires de validation pour les formulaires
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
  // Suppression des espaces éventuels
  const cleanedSiret = siret.replace(/\s/g, "");

  // Vérification que la chaîne contient exactement 14 chiffres
  return /^[0-9]{14}$/.test(cleanedSiret);
};

/**
 * Formater un numéro SIRET pour l'affichage
 */
export const formatSiret = (siret: string): string => {
  // Suppression des espaces
  const cleanedSiret = siret.replace(/\s/g, "");

  // Si le SIRET n'est pas valide, retourner la valeur d'origine
  if (!isValidSiret(cleanedSiret)) return siret;

  // Grouper par 3-3-3-5 pour une meilleure lisibilité
  return cleanedSiret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4");
};

/**
 * Vérifie si un numéro de téléphone français est valide
 */
export const isValidPhone = (phone: string): boolean => {
  // Suppression des espaces, tirets, points, etc.
  const cleanedPhone = phone.replace(/[\s.-]/g, "");

  // Vérification du format français: commençant par 0 suivi de 9 chiffres
  return /^(0|\+33|0033)[1-9][0-9]{8}$/.test(cleanedPhone);
};

/**
 * Formater un numéro de téléphone pour l'affichage
 */
export const formatPhone = (phone: string): string => {
  // Suppression des caractères non numériques
  const cleanedPhone = phone.replace(/\D/g, "");

  // Format français standard XX XX XX XX XX
  if (cleanedPhone.length === 10 && cleanedPhone.startsWith("0")) {
    return cleanedPhone.replace(
      /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
      "$1 $2 $3 $4 $5"
    );
  }

  return phone;
};

/**
 * Vérifie si un numéro de TVA intracommunautaire est valide
 */
export const isValidVatNumber = (vatNumber: string): boolean => {
  // Format européen: 2 lettres du pays suivies de 2 à 13 chiffres selon le pays
  // Pour la France: FR + 2 chiffres + 9 chiffres (SIREN)
  if (vatNumber.startsWith("FR")) {
    return /^FR[0-9]{2}[0-9]{9}$/.test(vatNumber.replace(/\s/g, ""));
  }

  // Format général européen simplifié
  return /^[A-Z]{2}[0-9A-Z]{2,12}$/.test(vatNumber.replace(/\s/g, ""));
};

/**
 * Formater un numéro de TVA pour l'affichage
 */
export const formatVatNumber = (vatNumber: string): string => {
  // Suppression des espaces
  const cleanedVat = vatNumber.replace(/\s/g, "");

  if (cleanedVat.startsWith("FR")) {
    // Format français: FR XX XXXXXXXXX
    return cleanedVat.replace(/^(FR)(\d{2})(\d{9})$/, "$1 $2 $3");
  }

  return vatNumber;
};

/**
 * Applique un masque de validation à un champ input en temps réel
 */
export const applyInputMask = (
  inputElement: HTMLInputElement,
  validationFn: (value: string) => boolean,
  formatFn?: (value: string) => string
): void => {
  // État précédent valide
  let previousValidValue = inputElement.value;

  // Handler pour l'événement input
  const handleInput = () => {
    const currentValue = inputElement.value;

    // Si la valeur actuelle passe la validation
    if (validationFn(currentValue)) {
      // Mettre à jour la valeur précédente valide
      previousValidValue = currentValue;

      // Appliquer le formatage si disponible
      if (formatFn) {
        inputElement.value = formatFn(currentValue);
      }
    } else {
      // Revenir à la dernière valeur valide
      inputElement.value = previousValidValue;
    }
  };

  // Attacher le handler à l'événement input
  inputElement.addEventListener("input", handleInput);
};

/**
 * Vérifie si une adresse email est valide
 */
export const isValidEmail = (email: string): boolean => {
  // Validation d'email basique
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
  // Caractères qui pourraient causer des problèmes dans un document
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
