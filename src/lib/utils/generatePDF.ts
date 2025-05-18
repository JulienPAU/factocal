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

interface JsPDFWithAutoTable extends jsPDF {
  autoTable: (options: AutoTableOptions) => void;
  lastAutoTable: {
    finalY: number;
  };
}

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

export const generateInvoicePDF = (invoice: Invoice): void => {
  if (!browser) return;

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("fr-FR");
    } catch (error) {
      return dateString;
    }
  };

  const formatMoney = (amount: number): string => {
    return `${amount.toFixed(2)} €`;
  };

  const calculateTotalWithoutTax = (invoice: Invoice): number => {
    const subtotal = calculateSubtotal(invoice.items);
    const discount = invoice.discount
      ? calculateDiscount(invoice.items, invoice.discount)
      : 0;
    return subtotal - discount;
  };

  const doc = new jsPDF();

  const margin = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineHeight = 10;

  let y = margin;
  const addSpace = (space: number) => {
    y += space;
  };

  const mmToPt = (mm: number) => mm * 2.83465;

  const addText = (
    text: string,
    x: number,
    y: number,
    options?: TextOptionsLight
  ): number => {
    if (!text) return 0;
    doc.text(text, x, y, options);
    return mmToPt(2.5);
  };

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const logo = get(logoStore);
  const initialY = y;

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

  const splitProviderText = doc.splitTextToSize(providerText, 80);
  doc.text(splitProviderText, margin, y);

  const providerHeight = splitProviderText.length * mmToPt(3);
  const providerEndY = y + providerHeight;

  if (logo) {
    try {
      let format = "JPEG";
      if (logo.indexOf("data:image/png") !== -1) {
        format = "PNG";
      } else if (logo.indexOf("data:image/jpeg") !== -1) {
        format = "JPEG";
      } else if (logo.indexOf("data:image/gif") !== -1) {
        format = "GIF";
      }

      const maxLogoHeight = 20;

      const logoHeight = Math.min(maxLogoHeight, providerHeight / 2);

      let ratio = 1;
      const imgData = logo.split(",")[1];
      const imgType = logo.split(";")[0].split("/")[1];

      try {
        if (format === "PNG" || format === "GIF") {
          ratio = 1;
        } else {
          ratio = 1.2;
        }
      } catch (e) {
        ratio = 1;
      }

      const logoWidth = logoHeight * ratio;

      const logoX = pageWidth - margin - logoWidth;
      const logoY = y;

      doc.addImage(logo, format, logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      console.error("Erreur lors de l'ajout du logo au PDF:", e);
    }
  }

  y = providerEndY + 5;

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

  addSpace(5);

  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setDrawColor(0);

  addSpace(5);

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

  if (invoice.documentType === "facture" && invoice.quotationId) {
    addSpace(5);
    doc.text(`Référence devis: ${invoice.quotationId}`, pageWidth - margin, y, {
      align: "right"
    });
  }

  addSpace(5);

  let clientText = `${invoice.client.name}\n`;
  clientText += `${invoice.client.address}`;
  if (invoice.client.email) {
    clientText += `\nEmail: ${invoice.client.email}`;
  }
  if (invoice.client.phone) {
    clientText += `\nTél: ${invoice.client.phone}`;
  }

  const splitClientText = doc.splitTextToSize(clientText, 80);
  doc.text(splitClientText, margin, y);

  y += splitClientText.length * mmToPt(3) + mmToPt(4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PRESTATIONS", margin, y);
  addSpace(4);
  doc.setFontSize(10);

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

  y = (doc as JsPDFWithAutoTable).lastAutoTable.finalY + 6;

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

  const totalsX = pageWidth - margin - 60;

  doc.setFont("helvetica", "normal");
  doc.text("Montant HT:", totalsX, y);
  doc.text(formatMoney(subtotal), pageWidth - margin, y, {
    align: "right"
  });

  if (invoice.discount && invoice.discount > 0) {
    addSpace(6);
    doc.setTextColor(220, 53, 69);
    doc.text(`Remise (${invoice.discount}%):`, totalsX, y);
    doc.text(formatMoney(-discountAmount), pageWidth - margin, y, {
      align: "right"
    });
    doc.setTextColor(0);
  }

  if (invoice.taxRate > 0) {
    addSpace(6);
    doc.text(`TVA (${invoice.taxRate}%):`, totalsX, y);
    doc.text(formatMoney(tax), pageWidth - margin, y, { align: "right" });

    addSpace(3);
    doc.line(totalsX, y, pageWidth - margin, y);
    addSpace(3);

    doc.setFont("helvetica", "bold");
    doc.text("Montant TTC:", totalsX, y);
    doc.text(formatMoney(total), pageWidth - margin, y, {
      align: "right"
    });
  } else {
    addSpace(3);
    doc.line(totalsX, y, pageWidth - margin, y);
    addSpace(6);

    doc.setFont("helvetica", "bold");
    doc.text("TOTAL:", totalsX, y);
    doc.text(formatMoney(total), pageWidth - margin, y, {
      align: "right"
    });

    addSpace(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("TVA non applicable, art. 293 B du CGI", totalsX, y, {
      align: "left"
    });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  }

  if (invoice.notes) {
    addSpace(12);
    doc.setFont("helvetica", "bold");
    doc.text("Notes et conditions :", margin, y);
    doc.setFont("helvetica", "normal");
    addSpace(6);

    const splitNotes = doc.splitTextToSize(
      invoice.notes,
      pageWidth - 2 * margin
    );
    doc.text(splitNotes, margin, y);
    y += splitNotes.length * lineHeight;
  }

  if (invoice.paymentMethod) {
    doc.setFont("helvetica", "bold");
    doc.text("Mode de paiement :", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.paymentMethod, margin + 40, y);
    y += lineHeight;
  }

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

  try {
    addLegalMentionsPage(doc, invoice.provider, invoice.documentType);
  } catch (error) {
    console.error("Erreur lors de l'ajout des mentions légales:", error);
  }

  doc.save(`${invoice.documentType}-${invoice.documentNumber}.pdf`);
};
