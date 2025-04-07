import { browser } from "$app/environment";
import jsPDF from "jspdf";
import type { TextOptionsLight } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  calculateSubtotal,
  calculateTotal,
  calculateTax,
  calculateDiscount
} from "$lib/types/invoice";
import type { Invoice } from "$lib/types/invoice";
import { get } from "svelte/store";
import { logoStore } from "./logoStorage";
import { formatDate, formatMoney } from "$lib/utils/formatters";
import { calculateTotalWithoutTax } from "./calculations";
import { getAppSettings } from "./settings";
import { addLegalMentionsPage } from "$lib/components/LegalMentions";

// Définir le type pour jsPDF avec autoTable
interface JsPDFWithAutoTable extends jsPDF {
  autoTable: (options: AutoTableOptions) => void;
  lastAutoTable: {
    finalY: number;
  };
}

// Interface pour les options de autoTable
interface AutoTableOptions {
  startY: number;
  head: string[][];
  body: string[][];
  theme: string;
  headStyles: Record<string, unknown>;
  styles: Record<string, unknown>;
  columnStyles: Record<string, unknown>;
  margin: Record<string, number>;
}

/**
 * Génère un PDF pour une facture ou un devis
 */
export const generateInvoicePDF = (invoice: Invoice): void => {
  if (!browser) return;

  // Fonction pour formater les dates
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR");
    } catch (error) {
      return dateString;
    }
  };

  // Fonction pour formater les montants
  const formatMoney = (amount: number): string => {
    return `${amount.toFixed(2)} €`;
  };

  // Fonction pour calculer le total sans TVA
  const calculateTotalWithoutTax = (invoice: Invoice): number => {
    const subtotal = calculateSubtotal(invoice.items);
    const discount = invoice.discount
      ? calculateDiscount(invoice.items, invoice.discount)
      : 0;
    return subtotal - discount;
  };

  const doc = new jsPDF();

  // Variables de mise en page
  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineHeight = 10;

  // Utilitaires pour le positionnement
  let y = margin;
  const addSpace = (space: number) => {
    y += space;
  };

  // Convertir les mesures de mm en points
  const mmToPt = (mm: number) => mm * 2.83465;

  // Ajouter une ligne de texte et retourner la hauteur de la ligne ajoutée
  const addText = (
    text: string,
    x: number,
    y: number,
    options?: TextOptionsLight
  ): number => {
    if (!text) return 0; // Si texte vide ou undefined, ne pas ajouter d'espace
    doc.text(text, x, y, options);
    return mmToPt(2.5); // Réduire davantage l'espacement (3.5mm → 2.5mm)
  };

  // Définir la police par défaut
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Logo à droite
  const logo = get(logoStore);
  const initialY = y;

  // Création d'une chaîne unique pour le prestataire avec séparateurs spécifiques
  let providerText = `${invoice.provider.name}\n`;
  providerText += `${invoice.provider.address}\n`;
  providerText += `SIRET: ${invoice.provider.siret}\n`;
  if (invoice.provider.tvaNumber) {
    providerText += `N° TVA: ${invoice.provider.tvaNumber}\n`;
  }
  providerText += `Email: ${invoice.provider.email}`;
  if (invoice.provider.phone) {
    providerText += `\nTél: ${invoice.provider.phone}`;
  }

  // Utilisation de splitTextToSize pour gérer les retours à la ligne uniformément
  const splitProviderText = doc.splitTextToSize(providerText, 80);
  doc.text(splitProviderText, margin, y);

  // Calculer la hauteur du bloc prestataire
  const providerHeight = splitProviderText.length * mmToPt(3);
  const providerEndY = y + providerHeight;

  // Si on a un logo, l'ajouter à droite
  if (logo) {
    try {
      // Déterminer le format de l'image depuis le type MIME dans le base64
      let format = "JPEG";
      if (logo.indexOf("data:image/png") !== -1) {
        format = "PNG";
      } else if (logo.indexOf("data:image/jpeg") !== -1) {
        format = "JPEG";
      } else if (logo.indexOf("data:image/gif") !== -1) {
        format = "GIF";
      }

      // Dimensions fixes pour le logo dans le PDF
      const maxLogoHeight = 20; // Hauteur maximale de 20mm

      // Hauteur fixe
      const logoHeight = Math.min(maxLogoHeight, providerHeight / 2);

      // Estimer le ratio en analysant l'image base64
      let ratio = 1; // Ratio par défaut
      const imgData = logo.split(",")[1];
      const imgType = logo.split(";")[0].split("/")[1];

      // Pour une estimation approximative du ratio à partir des premiers octets
      // Cette méthode est simplifiée et n'est pas aussi précise qu'une analyse complète
      try {
        // On va utiliser un ratio auto-adaptatif basé sur le format de l'image
        if (format === "PNG" || format === "GIF") {
          ratio = 1; // Images avec transparence, souvent logos
        } else {
          ratio = 1.2; // Photos ou images sans transparence
        }
      } catch (e) {
        ratio = 1; // En cas d'erreur, utiliser le ratio par défaut
      }

      // Calculer la largeur en fonction du ratio et de la hauteur
      const logoWidth = logoHeight * ratio;

      // Position du logo en haut à droite
      const logoX = pageWidth - margin - logoWidth;
      const logoY = y; // Aligner avec le haut du bloc prestataire (au lieu de margin)

      // Ajouter l'image
      doc.addImage(logo, format, logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      console.error("Erreur lors de l'ajout du logo au PDF:", e);
    }
  }

  // Mettre à jour y avec la position après le bloc prestataire
  y = providerEndY + 5; // Réduire l'espace à 5mm

  // Titre du document centré (facture ou devis)
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${invoice.documentType === "facture" ? "FACTURE" : "DEVIS"} N° ${
      invoice.documentNumber
    }`,
    pageWidth / 2,
    y,
    { align: "center" }
  );

  // Ajouter un espace après le titre, puis la ligne de séparation
  addSpace(5);

  // Ajouter une ligne de séparation après le titre
  doc.setDrawColor(200, 200, 200); // Gris clair
  doc.line(margin, y, pageWidth - margin, y);
  doc.setDrawColor(0); // Réinitialiser la couleur à noir

  addSpace(5); // Espace réduit après la ligne

  // Dates d'émission et d'échéance (alignées à droite)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Date d'émission: ${formatDate(invoice.issueDate)}`,
    pageWidth - margin,
    y,
    { align: "right" }
  );
  addSpace(5);
  doc.text(
    `Date d'échéance: ${formatDate(invoice.dueDate)}`,
    pageWidth - margin,
    y,
    { align: "right" }
  );

  // Si c'est une facture convertie depuis un devis, afficher la référence
  if (invoice.documentType === "facture" && invoice.quotationId) {
    addSpace(5); // Réduire l'espace de 5mm à 3mm
    doc.text(`Référence devis: ${invoice.quotationId}`, pageWidth - margin, y, {
      align: "right"
    });
  }

  addSpace(5); // Réduire l'espace de 10mm à 5mm

  // Informations du client
  // Même approche pour le client
  let clientText = `${invoice.client.name}\n`;
  clientText += `${invoice.client.address}`;
  if (invoice.client.email) {
    clientText += `\nEmail: ${invoice.client.email}`;
  }
  if (invoice.client.phone) {
    clientText += `\nTél: ${invoice.client.phone}`;
  }

  // Utilisation de splitTextToSize pour gérer les retours à la ligne uniformément
  const splitClientText = doc.splitTextToSize(clientText, 80);
  doc.text(splitClientText, margin, y);

  // Mise à jour de y après le bloc client
  y += splitClientText.length * mmToPt(3) + mmToPt(4); // Réduire l'espace de 6mm à 4mm

  // Titre pour la section des prestations
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PRESTATIONS", margin, y);
  addSpace(4); // Réduire l'espace de 6mm à 4mm
  doc.setFontSize(10);

  // Tableau des prestations avec autoTable
  (doc as JsPDFWithAutoTable).autoTable({
    startY: y,
    head: [["Description", "Quantité", "Prix unitaire (€)", "Total (€)"]],
    body: invoice.items.map((item) => [
      item.description,
      item.quantity.toString(),
      item.unitPrice.toFixed(2),
      (item.quantity * item.unitPrice).toFixed(2)
    ]),
    theme: "grid",
    headStyles: { fillColor: [66, 135, 245], textColor: 255 },
    styles: { overflow: "linebreak", cellWidth: "auto" },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 20, halign: "center" },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" }
    },
    margin: { left: margin, right: margin }
  });

  // Récupérer la position Y après le tableau
  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 6; // Réduire l'espace de 10mm à 6mm

  // Calcul des totaux
  const subtotal = calculateSubtotal(invoice.items);
  const discountAmount = invoice.discount
    ? calculateDiscount(invoice.items, invoice.discount)
    : 0;
  const tax = calculateTax(invoice.items, invoice.taxRate, invoice.discount);
  const total = calculateTotal(
    invoice.items,
    invoice.taxRate,
    invoice.discount
  );

  // Affichage des totaux
  const totalsX = pageWidth - margin - 60;

  doc.setFont("helvetica", "normal");
  doc.text("Montant HT:", totalsX, y);
  doc.text(formatMoney(subtotal), pageWidth - margin, y, {
    align: "right"
  });

  // Afficher la remise si elle existe
  if (invoice.discount && invoice.discount > 0) {
    addSpace(6); // Réduire l'espace de 10mm à 6mm
    doc.setTextColor(220, 53, 69); // Rouge pour la remise
    doc.text(`Remise (${invoice.discount}%):`, totalsX, y);
    doc.text(formatMoney(-discountAmount), pageWidth - margin, y, {
      align: "right"
    });
    doc.setTextColor(0); // Réinitialiser la couleur
  }

  if (invoice.taxRate > 0) {
    addSpace(6); // Réduire l'espace de 10mm à 6mm
    doc.text(`TVA (${invoice.taxRate}%):`, totalsX, y);
    doc.text(formatMoney(tax), pageWidth - margin, y, { align: "right" });

    addSpace(3); // Réduire l'espace de 5mm à 3mm
    doc.line(totalsX, y, pageWidth - margin, y);
    addSpace(3); // Réduire l'espace de 5mm à 3mm

    doc.setFont("helvetica", "bold");
    doc.text("Montant TTC:", totalsX, y);
    doc.text(formatMoney(total), pageWidth - margin, y, {
      align: "right"
    });
  } else {
    addSpace(3); // Réduire l'espace de 5mm à 3mm
    doc.line(totalsX, y, pageWidth - margin, y);
    addSpace(3); // Réduire l'espace de 5mm à 3mm

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", totalsX, y);
    doc.text(formatMoney(total), pageWidth - margin, y, {
      align: "right"
    });

    addSpace(6); // Réduire l'espace de 10mm à 6mm
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("TVA non applicable, art. 293 B du CGI", totalsX, y, {
      align: "left"
    });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  }

  // Notes
  if (invoice.notes) {
    addSpace(12); // Réduire l'espace de 20mm à 12mm
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", margin, y);
    addSpace(6); // Réduire l'espace de 10mm à 6mm
    doc.setFont("helvetica", "normal");

    // Découper le texte des notes pour éviter les débordements
    const splitNotes = doc.splitTextToSize(
      invoice.notes,
      pageWidth - 2 * margin
    );
    doc.text(splitNotes, margin, y);
  }

  // Ajouter les notes et conditions
  y += lineHeight * 2;

  // Ajouter le mode de paiement s'il est spécifié
  if (invoice.paymentMethod) {
    doc.setFont("helvetica", "bold");
    doc.text("Mode de paiement :", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.paymentMethod, margin + 40, y);
    y += lineHeight;
  }

  // Ajouter les notes s'il y en a
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Notes et conditions :", margin, y);
    doc.setFont("helvetica", "normal");
    y += lineHeight;

    const splitNotes = doc.splitTextToSize(
      invoice.notes,
      pageWidth - margin * 2
    );
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * lineHeight;
  }

  // Pied de page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `© ${new Date().getFullYear()} - Application de gestion de factures`,
    pageWidth / 2,
    pageHeight - 10,
    {
      align: "center"
    }
  );

  // Télécharger le PDF
  // Ajouter la page de mentions légales avant de sauvegarder le PDF
  try {
    addLegalMentionsPage(doc, invoice.provider, invoice.documentType);
  } catch (error) {
    console.error("Erreur lors de l'ajout des mentions légales:", error);
  }

  // Sauvegarder le PDF
  doc.save(`${invoice.documentType}-${invoice.documentNumber}.pdf`);
};
