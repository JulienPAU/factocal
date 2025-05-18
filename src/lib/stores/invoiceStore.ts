import { writable } from 'svelte/store';
import type { Invoice } from '$lib/types/invoice';
import { loadInvoices, saveInvoice, deleteInvoice, convertQuotationToInvoice } from '$lib/utils/storage';

function createInvoiceStore() {
    const { subscribe, set, update } = writable<Invoice[]>([]);

    return {
        subscribe,

        init: () => {
            const invoices = loadInvoices();
            set(invoices);
        },

        add: (invoice: Invoice) => {
            update(invoices => {
                saveInvoice(invoice);
                return [...invoices, invoice];
            });
        },

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

        remove: (id: string) => {
            update(invoices => {
                deleteInvoice(id);
                return invoices.filter(invoice => invoice.id !== id);
            });
        },

        convertToInvoice: (quotationId: string) => {
            update(invoices => {
                const newInvoice = convertQuotationToInvoice(quotationId);
                if (!newInvoice) return invoices;

                const updatedInvoices = invoices.map(doc =>
                    doc.id === quotationId ? { ...doc, convertedToInvoice: true } : doc
                );

                return [...updatedInvoices, newInvoice];
            });
        }
    };
}

export const invoices = createInvoiceStore();