<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { invoices } from '$lib/stores/invoiceStore';
    import { getInvoiceById } from '$lib/utils/storage';
    import type { Invoice, Item, DocumentType } from '$lib/types/invoice';
    import { calculateSubtotal, calculateTax, calculateTotal, calculateDiscount } from '$lib/types/invoice';
    import { generateDocumentNumber } from '$lib/utils/documentNumbering';
    import LogoUploader from '$lib/components/LogoUploader.svelte';
  
    // Mode édition ou création
    let editMode = false;
    let originalInvoiceId = '';
    
    // États du formulaire
    let documentType: DocumentType = 'facture';
    let documentNumber = '';
    let issueDate = new Date().toISOString().split('T')[0];
    
    // Calculer la date d'échéance par défaut (actuelle + 30 jours)
    let dueDate = (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    })();
    
    // Informations client
    let clientName = '';
    let clientAddress = '';
    let clientEmail = '';
    let clientPhone = '';
    
    // Informations prestataire (vos infos)
    let providerName = '';
    let providerAddress = '';
    let providerEmail = '';
    let providerPhone = '';
    let providerSiret = '';
    let providerTvaNumber = '';
    
    // Prestations
    let items: Item[] = [
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0
      }
    ];
    
    // Autres informations
    let taxRate = 0; // Pas de TVA par défaut
    let discount = 0; // Pas de remise par défaut
    let enableDiscount = false; // Option pour activer/désactiver la remise
    let notes = '';
    let quotationId = '';
    let advancePayment = 0;
    let enableAdvancePayment = false;
    
    // Message d'erreur
    let error = '';
    
    // Charger les données du document à éditer
    onMount(() => {
      // Récupérer l'ID du document à éditer depuis les paramètres d'URL
      const editId = $page.url.searchParams.get('edit');
      
      // Charger les informations du prestataire depuis localStorage
      const providerInfo = localStorage.getItem('provider_info');
      let savedProviderInfo = null;
      
      if (providerInfo) {
        try {
          savedProviderInfo = JSON.parse(providerInfo);
        } catch (error) {
          console.error("Erreur lors du chargement des informations prestataire:", error);
        }
      }
      
      if (editId) {
        // Mode édition
        editMode = true;
        originalInvoiceId = editId;
        
        // Récupérer le document depuis le store
        const invoice = $invoices.find(inv => inv.id === editId);
        
        if (invoice) {
          // Remplir le formulaire avec les données du document
          documentType = invoice.documentType;
          documentNumber = invoice.documentNumber;
          issueDate = invoice.issueDate;
          dueDate = invoice.dueDate;
          
          // Client
          clientName = invoice.client.name;
          clientAddress = invoice.client.address;
          clientEmail = invoice.client.email;
          clientPhone = invoice.client.phone || '';
          
          // Prestataire
          providerName = invoice.provider.name;
          providerAddress = invoice.provider.address;
          providerEmail = invoice.provider.email;
          providerPhone = invoice.provider.phone || '';
          providerSiret = invoice.provider.siret;
          providerTvaNumber = invoice.provider.tvaNumber || '';
          
          // Prestations
          items = [...invoice.items];
          
          // Autres informations
          taxRate = invoice.taxRate;
          discount = invoice.discount || 0;
          enableDiscount = discount > 0;
          notes = invoice.notes || '';
          quotationId = invoice.quotationId || '';
          advancePayment = invoice.advancePayment || 0;
          enableAdvancePayment = advancePayment > 0;
        } else {
          // Le document n'a pas été trouvé
          error = 'Document non trouvé';
          goto('/');
        }
      } else {
        // Mode création : générer un nouveau numéro de document
        documentNumber = generateDocumentNumber(documentType);
        
        if (savedProviderInfo) {
          // Utiliser les informations prestataire sauvegardées
          providerName = savedProviderInfo.name || '';
          providerAddress = savedProviderInfo.address || '';
          providerEmail = savedProviderInfo.email || '';
          providerPhone = savedProviderInfo.phone || '';
          providerSiret = savedProviderInfo.siret || '';
          providerTvaNumber = savedProviderInfo.tvaNumber || '';
        } else {
          // Pré-remplir avec les informations du dernier document créé (pour le prestataire)
          const lastInvoice = [...$invoices].sort((a, b) => 
            new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
          )[0];
          
          if (lastInvoice) {
            providerName = lastInvoice.provider.name;
            providerAddress = lastInvoice.provider.address;
            providerEmail = lastInvoice.provider.email;
            providerPhone = lastInvoice.provider.phone || '';
            providerSiret = lastInvoice.provider.siret;
            providerTvaNumber = lastInvoice.provider.tvaNumber || '';
          }
        }
      }
    });
  
    // Ajouter une nouvelle ligne de prestation
    const addItem = () => {
      items = [
        ...items,
        {
          id: crypto.randomUUID(),
          description: '',
          quantity: 1,
          unitPrice: 0
        }
      ];
    };
  
    // Supprimer une ligne de prestation
    const removeItem = (index: number) => {
      if (items.length > 1) {
        items = items.filter((_, i) => i !== index);
      }
    };
  
    // Calculer les totaux
    $: subtotal = calculateSubtotal(items);
    $: discountAmount = enableDiscount ? calculateDiscount(items, discount) : 0;
    $: tax = calculateTax(items, taxRate, enableDiscount ? discount : 0);
    $: advancePaymentAmount = enableAdvancePayment ? advancePayment : 0;
    $: total = calculateTotal(
      items, 
      taxRate, 
      enableDiscount ? discount : 0,
      enableAdvancePayment ? advancePayment : 0
    );
  
    // Sauvegarder la facture ou le devis
    const saveInvoice = () => {
      // Validation basique
      if (!clientName || !clientEmail || !providerName || !providerSiret) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
      }
      
      if (items.some(item => !item.description || item.quantity <= 0)) {
        alert('Veuillez remplir correctement toutes les prestations');
        return;
      }
      
      // Sauvegarder les infos du prestataire
      const providerInfo = {
        name: providerName,
        address: providerAddress,
        email: providerEmail,
        phone: providerPhone,
        siret: providerSiret,
        tvaNumber: providerTvaNumber
      };
      
      localStorage.setItem('provider_info', JSON.stringify(providerInfo));
      
      // Créer l'objet facture/devis
      const invoice: Invoice = {
        id: editMode ? originalInvoiceId : crypto.randomUUID(),
        documentType,
        documentNumber,
        issueDate,
        dueDate,
        client: {
          name: clientName,
          address: clientAddress,
          email: clientEmail,
          phone: clientPhone
        },
        provider: {
          name: providerName,
          address: providerAddress,
          email: providerEmail,
          phone: providerPhone,
          siret: providerSiret,
          tvaNumber: providerTvaNumber
        },
        items,
        taxRate,
        discount: enableDiscount ? discount : undefined,
        notes,
        quotationId,
        advancePayment: enableAdvancePayment ? advancePayment : undefined
      };
      
      // Sauvegarder dans le store
      if (editMode) {
        invoices.update(invoice);
      } else {
        invoices.add(invoice);
      }
      
      // Rediriger vers la page d'accueil
      goto('/');
    };
    
    // Mettre à jour le numéro de document lorsque le type change
    $: if (!editMode && documentType) {
      documentNumber = generateDocumentNumber(documentType);
    }
</script>

<svelte:head>
  <title>{editMode ? 'Modifier' : 'Créer'} un {documentType === 'facture' ? 'une facture' : 'un devis'}</title>
</svelte:head>

<main class="container mx-auto p-4 max-w-4xl">
  <div class="mb-8 flex justify-between items-center">
    <h1 class="text-3xl font-bold text-blue-800">
      {editMode ? 'Modifier' : 'Créer'} {documentType === 'facture' ? 'une facture' : 'un devis'}
    </h1>
    <button 
      class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
      on:click={() => goto('/')}
    >
      Retour à la liste
    </button>
  </div>

  <div class="bg-white shadow-md rounded-lg p-6">
    <form on:submit|preventDefault={saveInvoice}>
      <!-- Informations générales -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Infos document et prestataire -->
        <div>
          <!-- Type de document -->
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Type de document</label>
            <div class="flex space-x-4">
              <label class="inline-flex items-center">
                <input 
                  type="radio" 
                  bind:group={documentType} 
                  value="facture" 
                  class="form-radio h-5 w-5 text-blue-600"
                  disabled={editMode}
                >
                <span class="ml-2">Facture</span>
              </label>
              <label class="inline-flex items-center">
                <input 
                  type="radio" 
                  bind:group={documentType} 
                  value="devis" 
                  class="form-radio h-5 w-5 text-blue-600"
                  disabled={editMode}
                >
                <span class="ml-2">Devis</span>
              </label>
            </div>
          </div>
          
          <!-- Numéro de document -->
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Numéro de document</label>
            <input 
              type="text" 
              bind:value={documentNumber} 
              class="w-full p-2 border rounded-lg"
              readonly={!editMode}
            >
          </div>
          
          <!-- Numéro de devis (référence) si c'est une facture -->
          {#if documentType === 'facture'}
            <div class="mb-4">
              <label class="block text-gray-700 mb-2">Référence devis (optionnel)</label>
              <input 
                type="text" 
                bind:value={quotationId} 
                class="w-full p-2 border rounded-lg"
                placeholder="DEV-2025-XXX-XXX"
              >
            </div>
          {/if}
        </div>
        
        <!-- Dates -->
        <div>
          <!-- Date d'émission -->
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Date d'émission</label>
            <input 
              type="date" 
              bind:value={issueDate} 
              class="w-full p-2 border rounded-lg"
            >
          </div>
          
          <!-- Date d'échéance -->
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Date d'échéance</label>
            <input 
              type="date" 
              bind:value={dueDate} 
              class="w-full p-2 border rounded-lg"
            >
          </div>
          
          <!-- Logo -->
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Logo entreprise</label>
            <LogoUploader />
          </div>
        </div>
      </div>
      
      <hr class="my-6">
      
      <!-- Informations client et prestataire -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Informations prestataire -->
        <div>
          <h3 class="text-lg font-bold mb-3">Vos informations</h3>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Nom / Entreprise</label>
            <input 
              type="text" 
              bind:value={providerName} 
              class="w-full p-2 border rounded-lg"
              placeholder="Votre nom ou nom d'entreprise"
            >
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Adresse</label>
            <textarea 
              bind:value={providerAddress} 
              class="w-full p-2 border rounded-lg"
              placeholder="Votre adresse complète"
              rows="2"
            ></textarea>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              bind:value={providerEmail} 
              class="w-full p-2 border rounded-lg"
              placeholder="votre@email.com"
            >
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Téléphone (optionnel)</label>
            <input 
              type="tel" 
              bind:value={providerPhone} 
              class="w-full p-2 border rounded-lg"
              placeholder="Votre numéro de téléphone"
            >
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">SIRET</label>
            <input 
              type="text" 
              bind:value={providerSiret} 
              class="w-full p-2 border rounded-lg"
              placeholder="Numéro SIRET"
            >
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">N° TVA (optionnel)</label>
            <input 
              type="text" 
              bind:value={providerTvaNumber} 
              class="w-full p-2 border rounded-lg"
              placeholder="Numéro de TVA intracommunautaire"
            >
          </div>
        </div>
        
        <!-- Informations client -->
        <div>
          <h3 class="text-lg font-bold mb-3">Informations client</h3>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Nom / Entreprise</label>
            <input 
              type="text" 
              bind:value={clientName} 
              class="w-full p-2 border rounded-lg"
              placeholder="Nom du client ou entreprise"
              required
            >
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Adresse</label>
            <textarea 
              bind:value={clientAddress} 
              class="w-full p-2 border rounded-lg"
              placeholder="Adresse complète du client"
              rows="2"
              required
            ></textarea>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Email</label>
            <input 
              type="email" 
              bind:value={clientEmail} 
              class="w-full p-2 border rounded-lg"
              placeholder="client@email.com"
              required
            >
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Téléphone (optionnel)</label>
            <input 
              type="tel" 
              bind:value={clientPhone} 
              class="w-full p-2 border rounded-lg"
              placeholder="Numéro de téléphone du client"
            >
          </div>
        </div>
      </div>
      
      <hr class="my-6">
      
      <!-- Prestations -->
      <h2 class="text-xl font-bold mb-4 text-blue-800">Prestations</h2>
      <div class="mb-6">
        <div class="mb-4 overflow-x-auto">
          <table class="min-w-full">
            <thead>
              <tr class="bg-gray-100">
                <th class="py-2 px-4 text-left">Description *</th>
                <th class="py-2 px-4 text-left w-24">Quantité *</th>
                <th class="py-2 px-4 text-left w-32">Prix unitaire *</th>
                <th class="py-2 px-4 text-left w-32">Total</th>
                <th class="py-2 px-4 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {#each items as item, index}
                <tr>
                  <td class="py-2 px-4">
                    <input 
                      type="text" 
                      bind:value={item.description} 
                      class="w-full p-2 border rounded-lg"
                      required
                    >
                  </td>
                  <td class="py-2 px-4">
                    <input 
                      type="number" 
                      bind:value={item.quantity} 
                      min="1" 
                      class="w-full p-2 border rounded-lg"
                      required
                    >
                  </td>
                  <td class="py-2 px-4">
                    <div class="flex items-center">
                      <input 
                        type="number" 
                        bind:value={item.unitPrice} 
                        step="0.01" 
                        min="0" 
                        class="w-full p-2 border rounded-lg"
                        required
                      >
                      <span class="ml-2">€</span>
                    </div>
                  </td>
                  <td class="py-2 px-4">
                    {(item.quantity * item.unitPrice).toFixed(2)} €
                  </td>
                  <td class="py-2 px-4">
                    <button 
                      type="button" 
                      class="text-red-600 hover:text-red-800" 
                      on:click={() => removeItem(index)}
                      disabled={items.length === 1}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        
        <button 
          type="button" 
          class="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg" 
          on:click={addItem}
        >
          + Ajouter une prestation
        </button>
      </div>
      
      <!-- TVA et remise -->
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Taux de TVA (%)</label>
            <input 
              type="number" 
              bind:value={taxRate} 
              min="0" 
              max="100" 
              step="0.1" 
              class="w-full p-2 border rounded-lg"
            >
            <div class="text-xs text-gray-600 mt-1">
              Si vous n'êtes pas assujetti à la TVA, mettez 0%
            </div>
          </div>
          
          <div class="mb-4">
            <label class="flex items-center">
              <input type="checkbox" bind:checked={enableDiscount} class="form-checkbox h-5 w-5 text-blue-600">
              <span class="ml-2">Appliquer une remise</span>
            </label>
            
            {#if enableDiscount}
              <div class="mt-2">
                <label class="block text-gray-700 mb-2">Remise (%)</label>
                <input 
                  type="number" 
                  bind:value={discount} 
                  min="0" 
                  max="100" 
                  step="0.1" 
                  class="w-full p-2 border rounded-lg"
                >
              </div>
            {/if}
          </div>
        </div>
        
        <div class="space-y-2">
          <div class="flex justify-between">
            <span>Montant HT:</span>
            <span>{subtotal.toFixed(2)} €</span>
          </div>
          
          {#if enableDiscount && discount > 0}
            <div class="flex justify-between text-red-600">
              <span>Remise ({discount}%):</span>
              <span>-{discountAmount.toFixed(2)} €</span>
            </div>
          {/if}
          
          {#if taxRate > 0}
            <div class="flex justify-between">
              <span>TVA ({taxRate}%):</span>
              <span>{tax.toFixed(2)} €</span>
            </div>
            <div class="flex justify-between font-bold">
              <span>Montant TTC:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          {:else}
            <div class="flex justify-between font-bold">
              <span>TOTAL:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
            <div class="text-xs text-gray-600">
              TVA non applicable, art. 293 B du CGI
            </div>
          {/if}
        </div>
      </div>
      
      <!-- Accompte (si c'est une facture) -->
      {#if documentType === 'facture'}
        <div class="mb-6 p-4 bg-gray-50 rounded-lg">
          <div class="flex items-center mb-4">
            <input 
              type="checkbox" 
              id="enableAdvancePayment" 
              bind:checked={enableAdvancePayment}
              class="mr-2 h-4 w-4 text-blue-600"
            >
            <label for="enableAdvancePayment" class="font-medium text-gray-700">Appliquer un accompte</label>
          </div>
          
          {#if enableAdvancePayment}
            <div class="mt-2">
              <label class="block text-gray-700 mb-2">Montant de l'accompte (€)</label>
              <input 
                type="number" 
                bind:value={advancePayment} 
                min="0" 
                step="0.01" 
                class="w-full p-2 border rounded-lg"
              >
              <p class="text-sm text-gray-500 mt-1">Montant déjà versé par le client</p>
            </div>
          {/if}
        </div>
      {/if}
      
      <!-- Notes -->
      <div class="mb-6">
        <label class="block text-gray-700 mb-2">Notes / Conditions</label>
        <textarea 
          bind:value={notes} 
          class="w-full p-2 border rounded-lg" 
          rows="4"
          placeholder="Conditions de paiement, délais, etc."
        ></textarea>
      </div>
      
      <!-- Boutons d'action -->
      <div class="flex justify-end space-x-4">
        <button 
          type="button" 
          class="border border-gray-400 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100"
          on:click={() => goto('/')}
        >
          Annuler
        </button>
        <button 
          type="submit" 
          class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
        >
          Enregistrer
        </button>
      </div>
    </form>
  </div>
</main>

<style>
  /* Styles personnalisés si nécessaire */
</style>