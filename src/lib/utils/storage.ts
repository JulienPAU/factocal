/**
 * Module de gestion du stockage des factures et devis
 *
 * Ce fichier contient toutes les fonctions pour charger, sauvegarder, exporter et
 * manipuler les factures et devis. Il gère également la conversion des devis en factures
 * en utilisant le système de numérotation cohérent et en conservant la référence du
 * numéro de devis d'origine. Le stockage est basé sur le localStorage.
 */

import { browser } from "$app/environment";
import type {
  Invoice,
  Client,
  Provider,
  Item,
  DocumentType
} from "$lib/types/invoice";
import {
  calculateTotal,
  calculateSubtotal,
  calculateDiscount,
  calculateTax,
  calculateAdvancePayment
} from "$lib/types/invoice";
import { jsPDF } from "jspdf";
import { generateDocumentNumber } from "./documentNumbering";

// Clé de stockage dans le localStorage
const STORAGE_KEY = "invoices_data";

// Charger les données depuis le localStorage
export const loadInvoices = (): Invoice[] => {
  if (!browser) return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Erreur lors du chargement des factures:", error);
    return [];
  }
};

// Sauvegarder les données dans le localStorage
export const saveInvoices = (invoices: Invoice[]): void => {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des factures:", error);
  }
};

// Obtenir une facture par son ID
export const getInvoiceById = (id: string): Invoice | undefined => {
  const invoices = loadInvoices();
  return invoices.find((invoice) => invoice.id === id);
};

// Ajouter ou mettre à jour une facture
export const saveInvoice = (invoice: Invoice): void => {
  const invoices = loadInvoices();
  const index = invoices.findIndex((i) => i.id === invoice.id);

  if (index >= 0) {
    // Mise à jour d'une facture existante
    invoices[index] = invoice;
  } else {
    // Ajout d'une nouvelle facture
    invoices.push(invoice);
  }

  saveInvoices(invoices);
};

// Supprimer une facture
export const deleteInvoice = (id: string): void => {
  const invoices = loadInvoices();
  const updatedInvoices = invoices.filter((invoice) => invoice.id !== id);
  saveInvoices(updatedInvoices);
};

// Convertir un devis en facture
export const convertQuotationToInvoice = (
  quotationId: string
): Invoice | null => {
  const invoices = loadInvoices();
  const quotation = invoices.find(
    (doc) => doc.id === quotationId && doc.documentType === "devis"
  );

  if (!quotation) return null;

  // Marquer le devis comme converti
  quotation.convertedToInvoice = true;

  // Créer une nouvelle facture basée sur le devis
  const newInvoice: Invoice = {
    ...quotation,
    id: crypto.randomUUID(), // Nouvel ID
    documentType: "facture",
    documentNumber: generateDocumentNumber("facture"), // Utiliser la fonction de génération de numéro
    issueDate: new Date().toISOString().split("T")[0],
    quotationId: quotation.documentNumber // Utiliser le numéro de devis comme référence, pas l'ID
  };

  // Sauvegarder les modifications
  saveInvoice(quotation);
  saveInvoice(newInvoice);

  return newInvoice;
};

export const exportInvoiceToJson = (invoiceId: string): void => {
  if (!browser) return;

  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return;

  // Créer un Blob avec le JSON de la facture
  const fileData = JSON.stringify(invoice, null, 2);
  const blob = new Blob([fileData], { type: "application/json" });

  // Créer une URL pour le blob
  const url = URL.createObjectURL(blob);

  // Créer un lien de téléchargement et le déclencher
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.documentType}-${invoice.documentNumber}.json`;
  link.click();

  // Nettoyer l'URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Exporter une facture au format PDF
 */
export const exportInvoiceToPdf = (invoiceId: string): void => {
  if (!browser) return;

  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return;

  import("$lib/utils/logoStorage").then(({ logoStore }) => {
    let logoUrl = "";

    // S'abonner une seule fois au store pour récupérer le logo
    const unsubscribe = logoStore.subscribe((value) => {
      logoUrl = value || "";
    });
    unsubscribe();

    // Créer un nouveau document PDF
    const doc = new jsPDF();

    // ===== En-tête avec fond grisé =====
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, 210, 50, "F");

    // Calculer les largeurs pour l'en-tête
    let headerLeftWidth = 100; // Par défaut, sans logo
    let headerRightStart = 110; // Position de départ de la partie droite

    // Ajouter le logo s'il existe
    if (logoUrl) {
      try {
        // Dimensions par défaut pour le logo
        const logoSize = { width: 60, height: 40 };

        // Ratio d'aspect du logo (largeur/hauteur)
        const ratio = logoSize.width / logoSize.height;
        // Dimensions maximales dans le PDF
        const maxWidth = 40;
        const maxHeight = 25;

        // Calcul proportionnel pour respecter le ratio
        let pdfWidth: number;
        let pdfHeight: number;
        if (ratio > 1) {
          // Logo plus large que haut
          pdfWidth = Math.min(maxWidth, maxWidth);
          pdfHeight = pdfWidth / ratio;
        } else {
          // Logo plus haut que large ou carré
          pdfHeight = Math.min(maxHeight, maxHeight);
          pdfWidth = pdfHeight * ratio;
        }

        // Positionnement en haut à gauche
        doc.addImage(logoUrl, "JPEG", 15, 10, pdfWidth, pdfHeight, "", "FAST");

        // Ajuster la largeur disponible pour les informations
        headerLeftWidth = Math.max(50, pdfWidth + 10);
        headerRightStart = 70 + pdfWidth;
      } catch (error) {
        console.error("Erreur lors de l'ajout du logo:", error);
      }
    }

    // Titre à droite (FACTURE ou DEVIS)
    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    const docTitle = invoice.documentType === "facture" ? "FACTURE" : "DEVIS";
    doc.text(docTitle, headerRightStart + 60, 20, { align: "right" });

    // Numéro de document
    doc.setFontSize(12);
    doc.text(`N° ${invoice.documentNumber}`, headerRightStart + 60, 28, {
      align: "right"
    });

    // Dates
    doc.text(
      `Date d'émission: ${formatDate(invoice.issueDate)}`,
      headerRightStart + 60,
      36,
      {
        align: "right"
      }
    );
    doc.text(
      `Date d'échéance: ${formatDate(invoice.dueDate)}`,
      headerRightStart + 60,
      42,
      {
        align: "right"
      }
    );

    // Référence au devis si c'est une facture
    if (invoice.documentType === "facture" && invoice.quotationId) {
      doc.text(
        `Référence devis: ${invoice.quotationId}`,
        headerRightStart + 60,
        48,
        {
          align: "right"
        }
      );
    }

    // ===== Informations prestataire (à gauche) =====
    const headerY = 15;
    doc.setFontSize(10);
    doc.setFont("", "normal");

    // Position de départ pour les informations prestataire
    const providerStartY = logoUrl ? 25 : 15;

    // Nom prestataire en gras
    doc.setFont("", "bold");
    doc.text(invoice.provider.name, 15, providerStartY);
    doc.setFont("", "normal");

    // Adresse et autres infos prestataire
    let providerY = providerStartY + 6;
    const lineSpacing = 4.5; // Espacement réduit entre les lignes

    if (invoice.provider.address) {
      doc.text(invoice.provider.address, 15, providerY);
      providerY += lineSpacing;
    }

    if (invoice.provider.email) {
      doc.text(`Email: ${invoice.provider.email}`, 15, providerY);
      providerY += lineSpacing;
    }

    if (invoice.provider.phone) {
      doc.text(`Tél: ${invoice.provider.phone}`, 15, providerY);
      providerY += lineSpacing;
    }

    doc.text(`SIRET: ${invoice.provider.siret}`, 15, providerY);
    providerY += lineSpacing;

    if (invoice.provider.tvaNumber) {
      doc.text(`N° TVA: ${invoice.provider.tvaNumber}`, 15, providerY);
    }

    // ===== Informations client (encadré) =====
    const clientBoxY = 60;
    doc.setFillColor(250, 250, 250);
    doc.rect(110, clientBoxY - 5, 85, 30, "F");
    doc.setDrawColor(200, 200, 200);
    doc.rect(110, clientBoxY - 5, 85, 30, "S");

    doc.setFontSize(11);
    doc.setFont("", "bold");
    doc.text("FACTURÉ À:", 115, clientBoxY);
    doc.setFont("", "normal");

    // Informations du client avec espacement contrôlé
    let clientY = clientBoxY + 6;
    doc.text(invoice.client.name, 115, clientY);
    clientY += lineSpacing;

    if (invoice.client.address) {
      doc.text(invoice.client.address, 115, clientY);
      clientY += lineSpacing;
    }

    if (invoice.client.email) {
      doc.text(invoice.client.email, 115, clientY);
      clientY += lineSpacing;
    }

    if (invoice.client.phone) {
      doc.text(`Tél: ${invoice.client.phone}`, 115, clientY);
    }

    // ===== Tableau des articles =====
    const tableY = 100;

    // En-têtes du tableau
    doc.setFillColor(230, 230, 230);
    doc.rect(15, tableY - 5, 180, 10, "F");

    doc.setFont("", "bold");
    doc.text("Description", 20, tableY);
    doc.text("Quantité", 140, tableY);
    doc.text("Prix unitaire", 160, tableY);
    doc.text("Total", 185, tableY, { align: "right" });
    doc.setFont("", "normal");

    let itemY = tableY + 10;
    const itemSpacing = 8; // Espacement entre les lignes d'articles

    // Lignes du tableau
    for (const item of invoice.items) {
      // Vérifier si on déborde sur une nouvelle page
      if (itemY > 260) {
        doc.addPage();
        itemY = 20;
      }

      // Description peut être longue, la couper si nécessaire
      const description =
        item.description.length > 60
          ? `${item.description.substring(0, 58)}...`
          : item.description;

      doc.text(description, 20, itemY);
      doc.text(item.quantity.toString(), 140, itemY);
      doc.text(`${item.unitPrice.toFixed(2)} €`, 160, itemY);
      doc.text(`${(item.unitPrice * item.quantity).toFixed(2)} €`, 185, itemY, {
        align: "right"
      });

      itemY += itemSpacing;
    }

    // Ligne de séparation
    doc.setDrawColor(200, 200, 200);
    doc.line(15, itemY, 195, itemY);
    itemY += 10;

    // Récapitulatif des montants avec espacement uniforme
    const summarySpacing = 6;

    // Sous-total
    const subtotal = calculateSubtotal(invoice.items);
    const discount = invoice.discount
      ? calculateDiscount(invoice.items, invoice.discount)
      : 0;
    const tax = calculateTax(
      invoice.items,
      invoice.taxRate,
      invoice.discount || 0
    );
    const advancePayment = invoice.advancePayment
      ? calculateAdvancePayment(invoice.items, invoice.advancePayment)
      : 0;
    const finalTotal =
      invoice.totalAmount !== undefined
        ? invoice.totalAmount
        : calculateTotal(
            invoice.items,
            invoice.taxRate,
            invoice.discount,
            invoice.advancePayment
          );

    doc.text("Sous-total:", 140, itemY);
    doc.text(`${subtotal.toFixed(2)} €`, 185, itemY, { align: "right" });
    itemY += summarySpacing;

    // Remise
    if (invoice.discount && invoice.discount > 0) {
      doc.text(`Remise (${invoice.discount}%)`, 140, itemY);
      doc.text(`-${discount.toFixed(2)} €`, 185, itemY, { align: "right" });
      itemY += summarySpacing;
    }

    // TVA
    if (invoice.taxRate && invoice.taxRate > 0) {
      doc.text(`TVA (${invoice.taxRate}%)`, 140, itemY);
      doc.text(`${tax.toFixed(2)} €`, 185, itemY, { align: "right" });
      itemY += summarySpacing;
    }

    // Accompte
    if (invoice.advancePayment && invoice.advancePayment > 0) {
      doc.text("Accompte versé:", 140, itemY);
      doc.text(`-${advancePayment.toFixed(2)} €`, 185, itemY, {
        align: "right"
      });
      itemY += summarySpacing;
    }

    // Total en gras avec une bordure en haut
    doc.setDrawColor(100, 100, 100);
    doc.line(140, itemY - 1, 185, itemY - 1);
    doc.setFont("", "bold");
    doc.text("TOTAL:", 140, itemY + 5);
    doc.text(`${finalTotal.toFixed(2)} €`, 185, itemY + 5, { align: "right" });
    doc.setFont("", "normal");

    // ===== Notes et mentions légales =====
    itemY += 20; // Espace après le total

    // Notes du document
    if (invoice.notes) {
      doc.setFontSize(10);
      doc.text("Notes:", 15, itemY);
      itemY += 5;

      // Wrapping du texte pour éviter les dépassements
      const notesLines = doc.splitTextToSize(invoice.notes, 180);
      doc.text(notesLines, 15, itemY);

      // Ajuster la position Y en fonction du nombre de lignes
      itemY += notesLines.length * 5 + 10;
    }

    // Vérifier si on a besoin d'une nouvelle page pour les mentions légales
    if (itemY > 250) {
      doc.addPage();
      itemY = 20;
    }

    // Mentions légales en bas de page
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    // Mentions légales spécifiques selon le type de document
    if (invoice.documentType === "facture") {
      const legalNotices = [
        "Conditions de paiement : paiement à réception de facture.",
        "En cas de retard de paiement, indemnité forfaitaire pour frais de recouvrement : 40€",
        "Pas d'escompte pour paiement anticipé.",
        "TVA non applicable, art. 293 B du CGI"
      ];

      for (const notice of legalNotices) {
        doc.text(notice, 15, itemY);
        itemY += 4;
      }
    } else {
      const legalNotices = [
        "Ce devis est valable 30 jours à compter de sa date d'émission.",
        "La signature de ce devis vaut acceptation des conditions générales de vente.",
        "TVA non applicable, art. 293 B du CGI"
      ];

      for (const notice of legalNotices) {
        doc.text(notice, 15, itemY);
        itemY += 4;
      }
    }

    if (invoice.provider.siret) {
      itemY += 1;
      doc.text(`SIRET: ${invoice.provider.siret}`, 15, itemY);
    }

    // Pied de page avec numérotation
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} / ${pageCount}`, 195, 287, { align: "right" });
    }

    // Sauvegarder le PDF et le télécharger
    doc.save(`${invoice.documentType}-${invoice.documentNumber}.pdf`);
  });
};

// Fonction utilitaire pour formater les dates
const formatDate = (dateString: string): string => {
  if (!dateString) return "";

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch (error) {
    return dateString;
  }
};

// Exporter toutes les factures en JSON (ou filtrées par type)
export const exportAllInvoicesToJson = (
  type: "all" | "facture" | "devis" = "all"
): void => {
  if (!browser) return;

  const allInvoices = loadInvoices();

  // Filtrer les factures/devis selon le type demandé
  const filteredInvoices =
    type === "all"
      ? allInvoices
      : allInvoices.filter((inv) => inv.documentType === type);

  if (filteredInvoices.length === 0) {
    alert(`Aucun ${type === "facture" ? "facture" : "devis"} à exporter.`);
    return;
  }

  const fileData = JSON.stringify(filteredInvoices, null, 2);
  const blob = new Blob([fileData], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;

  // Nommer le fichier selon le type exporté
  const currentDate = new Date().toISOString().split("T")[0];
  const fileName =
    type === "all"
      ? `factures-et-devis-${currentDate}.json`
      : `${type === "facture" ? "factures" : "devis"}-${currentDate}.json`;

  link.download = fileName;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 100);
};

/**
 * Vérifier si une facture est potentiellement un doublon
 * @param invoice La facture à vérifier
 * @returns Un tableau de factures potentiellement dupliquées
 */
export const findPotentialDuplicates = (invoice: Invoice): Invoice[] => {
  const invoices = loadInvoices();
  const potentialDuplicates: Invoice[] = [];

  for (const existingInvoice of invoices) {
    // Ne pas comparer avec elle-même
    if (existingInvoice.id === invoice.id) continue;

    // Vérifier les correspondances exactes (numéro de document et type)
    if (
      existingInvoice.documentNumber === invoice.documentNumber &&
      existingInvoice.documentType === invoice.documentType
    ) {
      potentialDuplicates.push(existingInvoice);
    }
    // Vérifier les correspondances par client et montant
    else if (existingInvoice.client.name === invoice.client.name) {
      const existingTotal = calculateTotal(
        existingInvoice.items,
        existingInvoice.taxRate
      );
      const newTotal = calculateTotal(invoice.items, invoice.taxRate);

      // Si le montant total est identique ou très proche (différence < 1%)
      if (Math.abs(existingTotal - newTotal) < newTotal * 0.01) {
        potentialDuplicates.push(existingInvoice);
      }
    }
    // Vérifier les correspondances par date et montant
    else if (existingInvoice.issueDate === invoice.issueDate) {
      const existingTotal = calculateTotal(
        existingInvoice.items,
        existingInvoice.taxRate
      );
      const newTotal = calculateTotal(invoice.items, invoice.taxRate);

      // Si le montant total est identique ou très proche (différence < 5%)
      if (Math.abs(existingTotal - newTotal) < newTotal * 0.05) {
        potentialDuplicates.push(existingInvoice);
      }
    }
  }

  return potentialDuplicates;
};

/**
 * Importer une ou plusieurs factures à partir d'un fichier JSON
 * @param file Le fichier JSON à importer
 * @param checkDuplicates Vérifier les doublons
 * @returns Une promesse qui se résout avec l'ID de la dernière facture importée ou null en cas d'erreur
 */
export const importInvoiceFromJson = async (
  file: File,
  checkDuplicates = true
): Promise<{ id: string | null; duplicates: Invoice[] }> => {
  if (!browser) return { id: null, duplicates: [] };

  try {
    // Lire le contenu du fichier
    const content = await file.text();
    let invoiceData: Partial<Invoice> | Partial<Invoice>[];

    try {
      invoiceData = JSON.parse(content);
    } catch (e) {
      console.error("Erreur de parsing JSON:", e);
      throw new Error("Le fichier n'est pas un JSON valide");
    }

    // Si nous avons un seul objet, le transformer en tableau pour traitement uniforme
    const invoicesArray = Array.isArray(invoiceData)
      ? invoiceData
      : [invoiceData];

    if (invoicesArray.length === 0) {
      throw new Error("Le fichier JSON ne contient aucune facture");
    }

    const importedInvoices: Invoice[] = [];
    const allDuplicates: Invoice[] = [];

    // Traiter chaque facture dans le tableau
    for (const currentInvoice of invoicesArray) {
      // Vérifier que l'élément est un objet
      if (!currentInvoice || typeof currentInvoice !== "object") {
        console.warn("Document invalide ignoré: n'est pas un objet");
        continue;
      }

      // Vérifier les champs obligatoires
      if (!currentInvoice.documentType || !currentInvoice.documentNumber) {
        console.warn(
          "Document invalide ignoré: champs documentType ou documentNumber manquants"
        );
        continue;
      }

      // Vérifier le type de document
      if (
        currentInvoice.documentType !== "facture" &&
        currentInvoice.documentType !== "devis"
      ) {
        console.warn(
          `Document invalide ignoré: type ${currentInvoice.documentType} non reconnu`
        );
        continue;
      }

      // Vérifier que les structures client, provider et items existent
      if (
        !currentInvoice.client ||
        !currentInvoice.provider ||
        !Array.isArray(currentInvoice.items)
      ) {
        console.warn("Document invalide ignoré: structure incomplète");
        continue;
      }

      // Génération d'une facture valide avec un nouvel ID
      const newInvoice: Invoice = {
        id: crypto.randomUUID(),
        documentNumber: currentInvoice.documentNumber as string,
        documentType: currentInvoice.documentType as "facture" | "devis",
        issueDate:
          (currentInvoice.issueDate as string) ||
          new Date().toISOString().split("T")[0],
        dueDate: (currentInvoice.dueDate as string) || "",
        client: currentInvoice.client as Client,
        provider: currentInvoice.provider as Provider,
        items: currentInvoice.items as Item[],
        taxRate: Number(currentInvoice.taxRate || 0),
        discount: currentInvoice.discount
          ? Number(currentInvoice.discount)
          : undefined,
        notes: currentInvoice.notes || "",
        quotationId: currentInvoice.quotationId,
        convertedToInvoice: currentInvoice.convertedToInvoice || false,
        totalAmount: currentInvoice.totalAmount
          ? Number(currentInvoice.totalAmount)
          : undefined
      };

      // Vérifier les doublons
      if (checkDuplicates) {
        const duplicates = findPotentialDuplicates(newInvoice);
        if (duplicates.length > 0) {
          allDuplicates.push(...duplicates);
          // Ne pas sauvegarder cette facture pour l'instant
          importedInvoices.push(newInvoice);
          continue;
        }
      }

      // Sauvegarder directement si pas de doublons
      saveInvoice(newInvoice);
      importedInvoices.push(newInvoice);
    }

    // S'il n'y a aucune facture valide importée
    if (importedInvoices.length === 0) {
      throw new Error("Aucun document valide n'a pu être importé");
    }

    // Retourner l'ID de la dernière facture et les doublons trouvés
    return {
      id: importedInvoices[0].id,
      duplicates: allDuplicates
    };
  } catch (error) {
    console.error("Erreur lors de l'importation de la facture:", error);
    return { id: null, duplicates: [] };
  }
};

/**
 * Confirmer l'importation d'une facture malgré les doublons potentiels
 * @param id ID de la facture temporaire à importer
 */
export const confirmInvoiceImport = (id: string): void => {
  if (!browser) return;

  // Trouver toutes les factures temporaires (non sauvegardées)
  const allInvoices = loadInvoices();
  const pendingInvoice = allInvoices.find((inv) => inv.id === id);

  if (pendingInvoice) {
    // Utiliser saveInvoice pour sauvegarder la facture (créera un doublon volontairement)
    saveInvoice(pendingInvoice);
  }
};

/**
 * Envoyer une facture par email
 * @param invoiceId ID de la facture à envoyer
 * @param to Adresse email du destinataire
 * @param subject Objet du message
 * @param message Corps du message
 */
export const sendInvoiceByEmail = (
  invoiceId: string,
  to: string,
  subject: string,
  message: string
): void => {
  if (!browser) return;

  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return;

  // Construire l'URL pour l'email
  const documentType = invoice.documentType === "facture" ? "Facture" : "Devis";
  const mailtoSubject = encodeURIComponent(
    `${subject || `${documentType} ${invoice.documentNumber}`}`
  );
  const mailtoBody = encodeURIComponent(
    `${
      message ||
      `Veuillez trouver ci-joint ${documentType.toLowerCase()} N°${
        invoice.documentNumber
      }`
    }`
  );

  // Ouvrir le client de messagerie par défaut
  window.location.href = `mailto:${to}?subject=${mailtoSubject}&body=${mailtoBody}`;
};

// À propos de l'export et import de factures en format JSON
// Les fonctions dans ce fichier utilisent localStorage pour stocker les données des factures
// Ce que vous voyez à l'écran est une représentation de ces données stockées localement
// Si vous changez d'appareil ou effacez votre cache navigateur, exportez vos données d'abord
// pour pouvoir les réimporter ensuite
