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

const STORAGE_KEY = "invoices_data";

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

export const saveInvoices = (invoices: Invoice[]): void => {
  if (!browser) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch (error) {
    console.error("Erreur lors de la sauvegarde des factures:", error);
  }
};

export const getInvoiceById = (id: string): Invoice | undefined => {
  const invoices = loadInvoices();
  return invoices.find((invoice) => invoice.id === id);
};

export const saveInvoice = (invoice: Invoice): void => {
  const invoices = loadInvoices();
  const index = invoices.findIndex((i) => i.id === invoice.id);

  if (index >= 0) {
    invoices[index] = invoice;
  } else {
    invoices.push(invoice);
  }

  saveInvoices(invoices);
};

export const deleteInvoice = (id: string): void => {
  const invoices = loadInvoices();
  const updatedInvoices = invoices.filter((invoice) => invoice.id !== id);
  saveInvoices(updatedInvoices);
};

export const convertQuotationToInvoice = (
  quotationId: string
): Invoice | null => {
  const invoices = loadInvoices();
  const quotation = invoices.find(
    (doc) => doc.id === quotationId && doc.documentType === "devis"
  );

  if (!quotation) return null;

  quotation.convertedToInvoice = true;

  const newInvoice: Invoice = {
    ...quotation,
    id: crypto.randomUUID(),
    documentType: "facture",
    documentNumber: generateDocumentNumber("facture"),
    issueDate: new Date().toISOString().split("T")[0],
    quotationId: quotation.documentNumber
  };

  saveInvoice(quotation);
  saveInvoice(newInvoice);

  return newInvoice;
};

export const exportInvoiceToJson = (invoiceId: string): void => {
  if (!browser) return;

  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return;

  const fileData = JSON.stringify(invoice, null, 2);
  const blob = new Blob([fileData], { type: "application/json" });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoice.documentType}-${invoice.documentNumber}.json`;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportInvoiceToPdf = (invoiceId: string): void => {
  if (!browser) return;

  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return;

  import("$lib/utils/logoStorage").then(({ logoStore }) => {
    let logoUrl = "";

    const unsubscribe = logoStore.subscribe((value) => {
      logoUrl = value || "";
    });
    unsubscribe();

    const doc = new jsPDF();

    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, 210, 50, "F");

    let headerLeftWidth = 100;
    let headerRightStart = 110;

    if (logoUrl) {
      try {
        const logoSize = { width: 60, height: 40 };

        const ratio = logoSize.width / logoSize.height;
        const maxWidth = 40;
        const maxHeight = 25;

        let pdfWidth: number;
        let pdfHeight: number;
        if (ratio > 1) {
          pdfWidth = Math.min(maxWidth, maxWidth);
          pdfHeight = pdfWidth / ratio;
        } else {
          pdfHeight = Math.min(maxHeight, maxHeight);
          pdfWidth = pdfHeight * ratio;
        }

        doc.addImage(logoUrl, "JPEG", 15, 10, pdfWidth, pdfHeight, "", "FAST");

        headerLeftWidth = Math.max(50, pdfWidth + 10);
        headerRightStart = 70 + pdfWidth;
      } catch (error) {
        console.error("Erreur lors de l'ajout du logo:", error);
      }
    }

    doc.setFontSize(22);
    doc.setTextColor(0, 0, 0);
    const docTitle = invoice.documentType === "facture" ? "FACTURE" : "DEVIS";
    doc.text(docTitle, headerRightStart + 60, 20, { align: "right" });

    doc.setFontSize(12);
    doc.text(`N° ${invoice.documentNumber}`, headerRightStart + 60, 28, {
      align: "right"
    });

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

    const headerY = 15;
    doc.setFontSize(10);
    doc.setFont("", "normal");

    const providerStartY = logoUrl ? 25 : 15;

    doc.setFont("", "bold");
    doc.text(invoice.provider.name, 15, providerStartY);
    doc.setFont("", "normal");

    let providerY = providerStartY + 6;
    const lineSpacing = 4.5;

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

    const clientBoxY = 60;
    doc.setFillColor(250, 250, 250);
    doc.rect(110, clientBoxY - 5, 85, 30, "F");
    doc.setDrawColor(200, 200, 200);
    doc.rect(110, clientBoxY - 5, 85, 30, "S");

    doc.setFontSize(11);
    doc.setFont("", "bold");
    doc.text("FACTURÉ À:", 115, clientBoxY);
    doc.setFont("", "normal");

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

    const tableY = 100;

    doc.setFillColor(230, 230, 230);
    doc.rect(15, tableY - 5, 180, 10, "F");

    doc.setFont("", "bold");
    doc.text("Description", 20, tableY);
    doc.text("Quantité", 140, tableY);
    doc.text("Prix unitaire", 160, tableY);
    doc.text("Total", 185, tableY, { align: "right" });
    doc.setFont("", "normal");

    let itemY = tableY + 10;
    const itemSpacing = 8;

    for (const item of invoice.items) {
      if (itemY > 260) {
        doc.addPage();
        itemY = 20;
      }

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

    doc.setDrawColor(200, 200, 200);
    doc.line(15, itemY, 195, itemY);
    itemY += 10;

    const summarySpacing = 6;

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

    if (invoice.discount && invoice.discount > 0) {
      doc.text(`Remise (${invoice.discount}%)`, 140, itemY);
      doc.text(`-${discount.toFixed(2)} €`, 185, itemY, { align: "right" });
      itemY += summarySpacing;
    }

    if (invoice.taxRate && invoice.taxRate > 0) {
      doc.text(`TVA (${invoice.taxRate}%)`, 140, itemY);
      doc.text(`${tax.toFixed(2)} €`, 185, itemY, { align: "right" });
      itemY += summarySpacing;
    }

    if (invoice.advancePayment && invoice.advancePayment > 0) {
      doc.text("Accompte versé:", 140, itemY);
      doc.text(`-${advancePayment.toFixed(2)} €`, 185, itemY, {
        align: "right"
      });
      itemY += summarySpacing;
    }

    doc.setDrawColor(100, 100, 100);
    doc.line(140, itemY - 1, 185, itemY - 1);
    doc.setFont("", "bold");
    doc.text("TOTAL:", 140, itemY + 5);
    doc.text(`${finalTotal.toFixed(2)} €`, 185, itemY + 5, { align: "right" });
    doc.setFont("", "normal");

    itemY += 20;

    if (invoice.notes) {
      doc.setFontSize(10);
      doc.text("Notes:", 15, itemY);
      itemY += 5;

      const notesLines = doc.splitTextToSize(invoice.notes, 180);
      doc.text(notesLines, 15, itemY);

      itemY += notesLines.length * 5 + 10;
    }

    if (itemY > 250) {
      doc.addPage();
      itemY = 20;
    }

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

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

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Page ${i} / ${pageCount}`, 195, 287, { align: "right" });
    }

    doc.save(`${invoice.documentType}-${invoice.documentNumber}.pdf`);
  });
};

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

export const exportAllInvoicesToJson = (
  type: "all" | "facture" | "devis" = "all"
): void => {
  if (!browser) return;

  const allInvoices = loadInvoices();

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

  const currentDate = new Date().toISOString().split("T")[0];
  const fileName =
    type === "all"
      ? `factures-et-devis-${currentDate}.json`
      : `${type === "facture" ? "factures" : "devis"}-${currentDate}.json`;

  link.download = fileName;
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const findPotentialDuplicates = (invoice: Invoice): Invoice[] => {
  const invoices = loadInvoices();
  const potentialDuplicates: Invoice[] = [];

  for (const existingInvoice of invoices) {
    if (existingInvoice.id === invoice.id) continue;

    if (
      existingInvoice.documentNumber === invoice.documentNumber &&
      existingInvoice.documentType === invoice.documentType
    ) {
      potentialDuplicates.push(existingInvoice);
    }
    else if (existingInvoice.client.name === invoice.client.name) {
      const existingTotal = calculateTotal(
        existingInvoice.items,
        existingInvoice.taxRate
      );
      const newTotal = calculateTotal(invoice.items, invoice.taxRate);

      if (Math.abs(existingTotal - newTotal) < newTotal * 0.01) {
        potentialDuplicates.push(existingInvoice);
      }
    }
    else if (existingInvoice.issueDate === invoice.issueDate) {
      const existingTotal = calculateTotal(
        existingInvoice.items,
        existingInvoice.taxRate
      );
      const newTotal = calculateTotal(invoice.items, invoice.taxRate);

      if (Math.abs(existingTotal - newTotal) < newTotal * 0.05) {
        potentialDuplicates.push(existingInvoice);
      }
    }
  }

  return potentialDuplicates;
};

export const importInvoiceFromJson = async (
  file: File,
  checkDuplicates = true
): Promise<{ id: string | null; duplicates: Invoice[] }> => {
  if (!browser) return { id: null, duplicates: [] };

  try {
    const content = await file.text();
    let invoiceData: Partial<Invoice> | Partial<Invoice>[];

    try {
      invoiceData = JSON.parse(content);
    } catch (e) {
      console.error("Erreur de parsing JSON:", e);
      throw new Error("Le fichier n'est pas un JSON valide");
    }

    const invoicesArray = Array.isArray(invoiceData)
      ? invoiceData
      : [invoiceData];

    if (invoicesArray.length === 0) {
      throw new Error("Le fichier JSON ne contient aucune facture");
    }

    const importedInvoices: Invoice[] = [];
    const allDuplicates: Invoice[] = [];

    for (const currentInvoice of invoicesArray) {
      if (!currentInvoice || typeof currentInvoice !== "object") {
        console.warn("Document invalide ignoré: n'est pas un objet");
        continue;
      }

      if (!currentInvoice.documentType || !currentInvoice.documentNumber) {
        console.warn(
          "Document invalide ignoré: champs documentType ou documentNumber manquants"
        );
        continue;
      }

      if (
        currentInvoice.documentType !== "facture" &&
        currentInvoice.documentType !== "devis"
      ) {
        console.warn(
          `Document invalide ignoré: type ${currentInvoice.documentType} non reconnu`
        );
        continue;
      }

      if (
        !currentInvoice.client ||
        !currentInvoice.provider ||
        !Array.isArray(currentInvoice.items)
      ) {
        console.warn("Document invalide ignoré: structure incomplète");
        continue;
      }

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

      if (checkDuplicates) {
        const duplicates = findPotentialDuplicates(newInvoice);
        if (duplicates.length > 0) {
          allDuplicates.push(...duplicates);
          importedInvoices.push(newInvoice);
          continue;
        }
      }

      saveInvoice(newInvoice);
      importedInvoices.push(newInvoice);
    }

    if (importedInvoices.length === 0) {
      throw new Error("Aucun document valide n'a pu être importé");
    }

    return {
      id: importedInvoices[0].id,
      duplicates: allDuplicates
    };
  } catch (error) {
    console.error("Erreur lors de l'importation de la facture:", error);
    return { id: null, duplicates: [] };
  }
};

export const confirmInvoiceImport = (id: string): void => {
  if (!browser) return;

  const allInvoices = loadInvoices();
  const pendingInvoice = allInvoices.find((inv) => inv.id === id);

  if (pendingInvoice) {
    saveInvoice(pendingInvoice);
  }
};

export const sendInvoiceByEmail = (
  invoiceId: string,
  to: string,
  subject: string,
  message: string
): void => {
  if (!browser) return;

  const invoice = getInvoiceById(invoiceId);
  if (!invoice) return;

  const documentType = invoice.documentType === "facture" ? "Facture" : "Devis";
  const mailtoSubject = encodeURIComponent(
    `${subject || `${documentType} ${invoice.documentNumber}`}`
  );
  const mailtoBody = encodeURIComponent(
    `${message ||
    `Veuillez trouver ci-joint ${documentType.toLowerCase()} N°${invoice.documentNumber
    }`
    }`
  );

  window.location.href = `mailto:${to}?subject=${mailtoSubject}&body=${mailtoBody}`;
};
