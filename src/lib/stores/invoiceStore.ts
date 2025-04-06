import { writable } from 'svelte/store';
import type { Invoice } from '$lib/types/invoice';
import { loadInvoices, saveInvoice, deleteInvoice, convertQuotationToInvoice } from '$lib/utils/storage';

// Créer le store
function createInvoiceStore() {
    const { subscribe, set, update } = writable<Invoice[]>([]);

    return {
        subscribe,

        // Initialiser le store avec les données du localStorage
        init: () => {
            const invoices = loadInvoices();
            set(invoices);
        },

        // Ajouter une nouvelle facture
        add: (invoice: Invoice) => {
            update(invoices => {
                saveInvoice(invoice);
                return [...invoices, invoice];
            });
        },

        // Mettre à jour une facture existante
        update: (updatedInvoice: Invoice) => {
            update(invoices => {
                const index = invoices.findIndex(i => i.id === updatedInvoice.id);
                if (index >= 0) {
                    const updatedInvoices = [...invoices];
                    updatedInvoices[index] = updatedInvoice;
                    saveInvoice(updatedInvoice);
                    return updatedInvoices;
                }
                return invoices;
            });
        },

        // Supprimer une facture
        remove: (id: string) => {
            update(invoices => {
                deleteInvoice(id);
                return invoices.filter(invoice => invoice.id !== id);
            });
        },

        // Convertir un devis en facture
        convertToInvoice: (quotationId: string) => {
            update(invoices => {
                const newInvoice = convertQuotationToInvoice(quotationId);
                if (!newInvoice) return invoices;

                // Mettre à jour le devis pour le marquer comme converti
                const updatedInvoices = invoices.map(doc =>
                    doc.id === quotationId ? { ...doc, convertedToInvoice: true } : doc
                );

                // Ajouter la nouvelle facture
                return [...updatedInvoices, newInvoice];
            });
        }
    };
}

// Exporter le store
export const invoices = createInvoiceStore();