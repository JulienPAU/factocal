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
    import InputValidation from '$lib/components/InputValidation.svelte';
    import * as ValidationUtils from '$lib/components/ValidationUtils';
  
    let editMode = false;
    let originalInvoiceId = '';
    
    let documentType: DocumentType = 'facture';
    let documentNumber = '';
    let issueDate = new Date().toISOString().split('T')[0];
    
    let dueDate = (() => {
      const date = new Date();
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    })();
    
    let clientName = '';
    let clientAddress = '';
    let clientEmail = '';
    let clientPhone = '';
    
    let providerName = '';
    let providerAddress = '';
    let providerEmail = '';
    let providerPhone = '';
    let providerSiret = '';
    let providerTvaNumber = '';
    let providerMemberAga = false;
    let providerAcceptedPayments = '';
    
    type PaymentMethodsState = Record<string, boolean>;
    
    const PAYMENT_METHODS = [
      "Virement bancaire",
      "Carte bancaire",
      "Chèque",
      "Espèces",
      "PayPal",
      "Prélèvement automatique"
    ];
    
    const createEmptyPaymentMethodsState = (): PaymentMethodsState => {
      const state: PaymentMethodsState = {};
      for (const method of PAYMENT_METHODS) {
        state[method] = false;
      }
      return state;
    };
    
    let acceptedPaymentMethods: PaymentMethodsState = createEmptyPaymentMethodsState();
    
    let items: Item[] = [
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0
      }
    ];
    
    let taxRate = 0; 
    let discount = 0; 
    let enableDiscount = false; 
    let notes = '';
    let quotationId = '';
    let advancePayment = 0;
    let enableAdvancePayment = false;
    let paymentMethod = '';
    
    let error = '';
    
    onMount(() => {
      const editId = $page.url.searchParams.get('edit');
      
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
        editMode = true;
        originalInvoiceId = editId;
        
        const invoice = $invoices.find(inv => inv.id === editId);
        
        if (invoice) {
          documentType = invoice.documentType;
          documentNumber = invoice.documentNumber;
          issueDate = invoice.issueDate;
          dueDate = invoice.dueDate;
          
          clientName = invoice.client.name;
          clientAddress = invoice.client.address;
          clientEmail = invoice.client.email;
          clientPhone = invoice.client.phone || '';
          
          providerName = invoice.provider.name;
          providerAddress = invoice.provider.address;
          providerEmail = invoice.provider.email;
          providerPhone = invoice.provider.phone || '';
          providerSiret = invoice.provider.siret;
          providerTvaNumber = invoice.provider.tvaNumber || '';
          providerMemberAga = invoice.provider.memberAga || false;
          providerAcceptedPayments = invoice.provider.acceptedPayments || '';
          parseAcceptedPayments(providerAcceptedPayments);
          
          items = [...invoice.items];
          
          taxRate = invoice.taxRate;
          discount = invoice.discount || 0;
          enableDiscount = discount > 0;
          notes = invoice.notes || '';
          quotationId = invoice.quotationId || '';
          advancePayment = invoice.advancePayment || 0;
          enableAdvancePayment = advancePayment > 0;
          paymentMethod = invoice.paymentMethod || '';
        } else {
          error = 'Document non trouvé';
          goto('/');
        }
      } else {
        documentNumber = generateDocumentNumber(documentType);
        
        if (savedProviderInfo) {
          providerName = savedProviderInfo.name || '';
          providerAddress = savedProviderInfo.address || '';
          providerEmail = savedProviderInfo.email || '';
          providerPhone = savedProviderInfo.phone || '';
          providerSiret = savedProviderInfo.siret || '';
          providerTvaNumber = savedProviderInfo.tvaNumber || '';
          providerMemberAga = savedProviderInfo.memberAga || false;
          providerAcceptedPayments = savedProviderInfo.acceptedPayments || '';
          parseAcceptedPayments(providerAcceptedPayments);
        } else {
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
            providerMemberAga = lastInvoice.provider.memberAga || false;
            providerAcceptedPayments = lastInvoice.provider.acceptedPayments || '';
            parseAcceptedPayments(providerAcceptedPayments);
          }
        }
      }
    });
  
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
  
    const removeItem = (index: number) => {
      if (items.length > 1) {
        items = items.filter((_, i) => i !== index);
      }
    };
  
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
  
    function parseAcceptedPayments(paymentsString: string): void {
      acceptedPaymentMethods = createEmptyPaymentMethodsState();
      
      if (!paymentsString) return;
      
      const methods = paymentsString.split(',').map(m => m.trim());
      for (const method of methods) {
        if (method in acceptedPaymentMethods) {
          acceptedPaymentMethods[method] = true;
        }
      }
    }
    
    function generateAcceptedPaymentsString(): string {
      return Object.entries(acceptedPaymentMethods)
        .filter(([_, checked]) => checked)
        .map(([method]) => method)
        .join(', ');
    }
    
    function updateAcceptedPayments(): void {
      providerAcceptedPayments = generateAcceptedPaymentsString();
    }
    
    $: if (typeof window !== 'undefined') {
      updateAcceptedPayments();
    }
  
    const saveInvoice = () => {
      let isValid = true;
      const errorMessages = [];
      
      if (!providerName) {
        isValid = false;
        errorMessages.push("Nom du prestataire requis");
      }
      
      if (!providerAddress) {
        isValid = false;
        errorMessages.push("Adresse du prestataire requise");
      }
      
      if (!providerEmail || !ValidationUtils.isValidEmail(providerEmail)) {
        isValid = false;
        errorMessages.push("Email du prestataire invalide");
      }
      
      if (!ValidationUtils.isValidSiret(providerSiret)) {
        isValid = false;
        errorMessages.push("SIRET invalide (doit contenir 14 chiffres)");
      }
      
      if (providerTvaNumber && !ValidationUtils.isValidVatNumber(providerTvaNumber)) {
        isValid = false;
        errorMessages.push("Numéro de TVA invalide");
      }
      
      if (!clientName) {
        isValid = false;
        errorMessages.push("Nom du client requis");
      }
      
      if (!clientAddress) {
        isValid = false;
        errorMessages.push("Adresse du client requise");
      }
      
      if (!clientEmail || !ValidationUtils.isValidEmail(clientEmail)) {
        isValid = false;
        errorMessages.push("Email du client invalide");
      }
      
      if (clientPhone && !ValidationUtils.isValidPhone(clientPhone)) {
        isValid = false;
        errorMessages.push("Numéro de téléphone du client invalide");
      }
      
      if (items.some(item => !item.description || item.quantity <= 0)) {
        isValid = false;
        errorMessages.push("Toutes les prestations doivent avoir une description et une quantité > 0");
      }
      
      if (!isValid) {
        alert(`Veuillez corriger les erreurs suivantes:\n\n${errorMessages.join("\n")}`);
        return;
      }
      
      const acceptedPayments = generateAcceptedPaymentsString();
      const providerInfo = {
        name: providerName,
        address: providerAddress,
        email: providerEmail,
        phone: providerPhone,
        siret: ValidationUtils.formatSiret(providerSiret), 
        tvaNumber: providerTvaNumber ? ValidationUtils.formatVatNumber(providerTvaNumber) : '', 
        memberAga: providerMemberAga,
        acceptedPayments
      };
      
      localStorage.setItem('provider_info', JSON.stringify(providerInfo));
      
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
          phone: clientPhone ? ValidationUtils.formatPhone(clientPhone) : undefined
        },
        provider: {
          name: providerName,
          address: providerAddress,
          email: providerEmail,
          phone: providerPhone ? ValidationUtils.formatPhone(providerPhone) : undefined,
          siret: ValidationUtils.formatSiret(providerSiret),
          tvaNumber: providerTvaNumber ? ValidationUtils.formatVatNumber(providerTvaNumber) : undefined,
          memberAga: providerMemberAga,
          acceptedPayments
        },
        items,
        taxRate,
        discount: enableDiscount ? discount : undefined,
        notes,
        quotationId,
        advancePayment: enableAdvancePayment ? advancePayment : undefined,
        paymentMethod
      };
      
      if (editMode) {
        invoices.update(invoice);
      } else {
        invoices.add(invoice);
      }
      
      goto('/');
    };
    
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
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
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
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Numéro de document</label>
            <input 
              type="text" 
              bind:value={documentNumber} 
              class="w-full p-2 border rounded-lg"
              readonly={!editMode}
            >
          </div>
          
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
        
        <div>
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Date d'émission</label>
            <input 
              type="date" 
              bind:value={issueDate} 
              class="w-full p-2 border rounded-lg"
              required
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Date d'échéance</label>
            <input 
              type="date" 
              bind:value={dueDate} 
              class="w-full p-2 border rounded-lg"
              required
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Logo entreprise</label>
            <LogoUploader />
          </div>
        </div>
      </div>
      
      <hr class="my-6">
      
      <div class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-lg font-bold mb-3">Vos informations</h3>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Nom / Entreprise</label>
            <InputValidation
              type="text"
              bind:value={providerName}
              placeholder="Votre nom ou nom d'entreprise"
              required={true}
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Adresse</label>
            <textarea 
              bind:value={providerAddress} 
              class="w-full p-2 border rounded-lg"
              placeholder="Votre adresse complète"
              rows="2"
              required
            ></textarea>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Email</label>
            <InputValidation
              type="email"
              bind:value={providerEmail}
              placeholder="votre@email.com"
              required={true}
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Téléphone (optionnel)</label>
            <InputValidation
              type="tel"
              bind:value={providerPhone}
              placeholder="Votre numéro de téléphone"
              required={false}
              helpText="Format: 06 XX XX XX XX"
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">SIRET</label>
            <InputValidation
              type="siret"
              bind:value={providerSiret}
              placeholder="Numéro SIRET (14 chiffres)"
              required={true}
              errorMessage="Le SIRET doit comporter 14 chiffres"
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">N° TVA (optionnel)</label>
            <InputValidation
              type="vat"
              bind:value={providerTvaNumber}
              placeholder="Ex: FR 12 345678901"
              required={false}
              helpText="Format européen (ex: FR XX XXXXXXXXX)"
            />
          </div>
          
          <div class="mb-4">
            <label class="flex items-center">
              <input type="checkbox" bind:checked={providerMemberAga} class="form-checkbox h-5 w-5 text-blue-600">
              <span class="ml-2">Membre d'une association agréée</span>
            </label>
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Moyens de paiement acceptés</label>
            <div class="grid grid-cols-2 gap-2">
              {#each Object.entries(acceptedPaymentMethods) as [method, checked]}
                <label class="flex items-center">
                  <input 
                    type="checkbox" 
                    bind:checked={acceptedPaymentMethods[method]} 
                    on:change={updateAcceptedPayments}
                    class="form-checkbox h-5 w-5 text-blue-600">
                  <span class="ml-2">{method}</span>
                </label>
              {/each}
            </div>
            <div class="text-xs text-gray-600 mt-1">
              Ces informations apparaissent dans les mentions légales de vos documents PDF (page 2) et non sur la première page. Pour afficher un mode de paiement spécifique sur la première page, utilisez le champ "Mode de paiement" ci-dessous.
            </div>
            <div class="text-xs text-gray-600">Valeur actuelle: {providerAcceptedPayments}</div>
          </div>
        </div>
        
        <div>
          <h3 class="text-lg font-bold mb-3">Informations client</h3>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Nom / Entreprise</label>
            <InputValidation
              type="text"
              bind:value={clientName}
              placeholder="Nom du client ou entreprise"
              required={true}
            />
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
            <InputValidation
              type="email"
              bind:value={clientEmail}
              placeholder="client@email.com"
              required={true}
            />
          </div>
          
          <div class="mb-4">
            <label class="block text-gray-700 mb-2">Téléphone (optionnel)</label>
            <InputValidation
              type="tel"
              bind:value={clientPhone}
              placeholder="Numéro de téléphone du client"
              required={false}
            />
          </div>
        </div>
      </div>
      
      <hr class="my-6">
      
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
      
      <!-- Mode de paiement -->
      <div class="mb-6">
        <label class="block text-gray-700 mb-2">Mode de paiement</label>
        <select 
          bind:value={paymentMethod} 
          class="w-full p-2 border rounded-lg"
        >
          <option value="">Sélectionner un mode de paiement</option>
          <option value="Virement bancaire">Virement bancaire</option>
          <option value="Carte bancaire">Carte bancaire</option>
          <option value="Chèque">Chèque</option>
          <option value="Espèces">Espèces</option>
          <option value="PayPal">PayPal</option>
          <option value="Prélèvement automatique">Prélèvement automatique</option>
        </select>
      </div>
      
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