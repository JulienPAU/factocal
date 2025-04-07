/**
 * Module de génération des mentions légales pour les factures et devis
 * Basé sur les exigences légales françaises pour les documents commerciaux
 */

import type { Provider } from "$lib/types/invoice";

/**
 * Génère les mentions légales pour un document PDF
 * @param provider Informations du prestataire
 * @param documentType Type de document (facture/devis)
 * @returns Le texte formaté des mentions légales
 */
export function generateLegalMentions(
  provider: Provider,
  documentType: "facture" | "devis"
): string[] {
  const mentions: string[] = [];

  mentions.push("MENTIONS LÉGALES OBLIGATOIRES");

  mentions.push("Identification du professionnel");
  mentions.push(`${provider.name} - Entrepreneur individuel`);
  mentions.push(`SIRET : ${provider.siret}`);
  if (provider.tvaNumber) {
    mentions.push(`TVA Intracommunautaire : ${provider.tvaNumber}`);
  } else {
    mentions.push("TVA non applicable, article 293 B du CGI");
  }
  mentions.push(`Adresse : ${provider.address}`);
  mentions.push(`Email : ${provider.email}`);
  if (provider.phone) {
    mentions.push(`Téléphone : ${provider.phone}`);
  }

  mentions.push("");
  mentions.push("Conditions générales");

  if (documentType === "facture") {
    mentions.push(
      "• Sauf mention contraire, cette facture est payable à réception."
    );
    mentions.push("• Aucun escompte n'est accordé pour paiement anticipé.");
    mentions.push(
      "• Tout retard de paiement entraînera des pénalités de retard égales à 3 fois le taux d'intérêt légal ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40€."
    );

    mentions.push("");
    mentions.push("Garanties légales");
    mentions.push(
      "• Les prestations de services sont soumises à la garantie légale de conformité (articles L.217-4 et suivants du Code de la consommation) et à la garantie des vices cachés (articles 1641 et suivants du Code civil)."
    );
  } else {
    mentions.push(
      "• Ce devis est valable 30 jours à compter de sa date d'émission."
    );
    mentions.push(
      "• La signature de ce devis vaut acceptation des conditions générales de vente."
    );
    mentions.push("• Acompte demandé : 30% du montant total.");
  }

  mentions.push("");
  mentions.push("Médiation et litiges");
  mentions.push(
    "• En cas de litige, une solution amiable sera recherchée avant toute action judiciaire."
  );
  mentions.push(
    "• Conformément aux articles L.616-1 et R.616-1 du code de la consommation, un médiateur de la consommation peut être sollicité en cas de litige."
  );

  mentions.push("");
  mentions.push("Protection des données personnelles");
  mentions.push(
    "• Les informations recueillies font l'objet d'un traitement informatique destiné à la gestion de la relation client et aux obligations comptables et fiscales."
  );
  mentions.push(
    "• Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et d'opposition aux données vous concernant, en écrivant à l'adresse email indiquée ci-dessus."
  );

  mentions.push("Mentions légales");
  mentions.push("");

  mentions.push("DÉLAIS DE PAIEMENT");
  mentions.push(
    "Conformément à l'article L441-10 du Code de commerce, les factures sont payables à 30 jours à compter de la date d'émission de la facture."
  );
  mentions.push(
    "Tout retard de paiement entraînera des pénalités de retard exigibles sans rappel au taux d'intérêt appliqué par la Banque centrale européenne"
  );
  mentions.push(
    "à son opération de refinancement la plus récente majoré de 10 points de pourcentage, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40€."
  );
  mentions.push("");

  mentions.push("MODALITÉS DE PAIEMENT");
  mentions.push(
    `Les règlements peuvent être effectués par ${
      provider.acceptedPayments || "virement bancaire, chèque ou carte bancaire"
    }.`
  );
  if (provider.memberAga) {
    mentions.push(
      "Membre d'une association agréée, le règlement par chèque et carte bancaire est accepté."
    );
  }
  mentions.push("");

  mentions.push("MÉDIATION DE LA CONSOMMATION");
  mentions.push(
    "Conformément aux articles L.616-1 et R.616-1 du code de la consommation, nous proposons un dispositif de médiation de la consommation."
  );
  mentions.push(
    "L'entité de médiation retenue est : CNPM - MÉDIATION DE LA CONSOMMATION."
  );
  mentions.push(
    "En cas de litige, vous pouvez déposer votre réclamation sur son site : https://cnpm-mediation-consommation.eu"
  );
  mentions.push(
    "ou par voie postale en écrivant à CNPM - MÉDIATION - CONSOMMATION - 27 avenue de la libération - 42400 Saint-Chamond."
  );
  mentions.push("");

  if (!provider.tvaNumber || provider.tvaNumber.trim() === "") {
    mentions.push("TVA");
    mentions.push(
      "TVA non applicable, article 293 B du Code Général des Impôts."
    );
    mentions.push("");
  }

  return mentions;
}

/**
 * Ajoute les mentions légales à un document PDF jsPDF
 * @param doc Document jsPDF
 * @param provider Informations du prestataire
 * @param documentType Type de document
 */
export function addLegalMentionsPage(
  doc: {
    addPage: () => void;
    internal: {
      pageSize: {
        getWidth: () => number;
        getHeight: () => number;
      };
    };
    setFontSize: (size: number) => void;
    setFont: (font: string, style: string) => void;
    setTextColor: (color: number) => void;
    splitTextToSize: (text: string, maxWidth: number) => string[];
    text: (
      text: string | string[],
      x: number,
      y: number,
      options?: Record<string, unknown>
    ) => void;
  },
  provider: Provider,
  documentType: "facture" | "devis"
): void {
  // Ajouter une nouvelle page
  doc.addPage();

  // Paramètres de mise en page
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  // Configuration du texte
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  // Récupérer les mentions légales
  const mentions = generateLegalMentions(provider, documentType);

  // Ajouter les titres et les mentions
  for (let i = 0; i < mentions.length; i++) {
    const line = mentions[i];

    // Titres en gras
    if (
      i === 0 ||
      line === "Identification du professionnel" ||
      line === "Conditions générales" ||
      line === "Garanties légales" ||
      line === "Médiation et litiges" ||
      line === "Protection des données personnelles"
    ) {
      doc.setFont("helvetica", "bold");

      // Le titre principal est plus grand
      if (i === 0) {
        doc.setFontSize(14);
        doc.text(line, pageWidth / 2, y, { align: "center" });
        y += 10;
        doc.setFontSize(10);
      } else {
        doc.text(line, margin, y);
        y += 5;
      }

      doc.setFont("helvetica", "normal");
    }
    // Ligne vide
    else if (line === "") {
      y += 5;
    }
    // Texte normal
    else {
      // Ajuster le texte pour qu'il rentre dans la page
      const splitText = doc.splitTextToSize(line, pageWidth - 2 * margin);
      doc.text(splitText, margin, y);
      y += 5 * splitText.length;
    }
  }

  // Pied de page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Document généré le ${new Date().toLocaleDateString("fr-FR")}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: "center" }
  );
}
