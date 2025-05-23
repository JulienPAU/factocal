import { browser } from "$app/environment";
import type { Invoice } from "$lib/types/invoice";

const DB_NAME = "factures_db";
const DB_VERSION = 1;
const STORE_NAME = "invoices";

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!browser) reject(new Error("IndexedDB non disponible côté serveur"));

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Erreur lors de l'ouverture de la base de données"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

export const loadInvoicesFromDB = async (): Promise<Invoice[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          new Error("Erreur lors du chargement des factures depuis IndexedDB")
        );
      };
    });
  } catch (error) {
    console.error("Erreur lors du chargement des factures:", error);
    return [];
  }
};

export const saveInvoiceToDB = async (invoice: Invoice): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(invoice);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error("Erreur lors de la sauvegarde de la facture dans IndexedDB")
        );
      };
    });
  } catch (error) {
    console.error("Erreur lors de la sauvegarde de la facture:", error);
  }
};

export const getInvoiceByIdFromDB = async (
  id: string
): Promise<Invoice | undefined> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(
          new Error(
            "Erreur lors de la récupération de la facture depuis IndexedDB"
          )
        );
      };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de la facture:", error);
    return undefined;
  }
};

export const deleteInvoiceFromDB = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(
          new Error(
            "Erreur lors de la suppression de la facture dans IndexedDB"
          )
        );
      };
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de la facture:", error);
  }
};

export const migrateLocalStorageToIndexedDB = async (): Promise<void> => {
  if (!browser) return;

  try {
    const data = localStorage.getItem("invoices_data");
    if (!data) return;

    const invoices: Invoice[] = JSON.parse(data);
    if (!invoices.length) return;

    for (const invoice of invoices) {
      await saveInvoiceToDB(invoice);
    }

    console.log("Migration des données réussie");
  } catch (error) {
    console.error("Erreur lors de la migration des données:", error);
  }
};
