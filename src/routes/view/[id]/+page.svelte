<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { getInvoiceById, sendInvoiceByEmail } from '$lib/utils/storage';
    import { logoStore, initLogoStore } from '$lib/utils/logoStorage';
    import { generateInvoicePDF } from '$lib/utils/generatePDF';
    import { calculateSubtotal, calculateTax, calculateTotal, calculateDiscount, calculateAdvancePayment } from '$lib/types/invoice';
    import type { Invoice } from '$lib/types/invoice';
    
    let invoice: Invoice | null = null;
    let subtotal = 0;
    let discountAmount = 0;
    let tax = 0;
    let total = 0;
    let advancePaymentAmount = 0;
    let loading = true;
    let error: string | null = null;
    
    let showEmailModal = false;
    let emailTo = '';
    let emailSubject = '';
    let emailMessage = '';

    let showToast = false;
    let toastMessage = '';
    let toastType: 'success' | 'error' = 'success';
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    
    onMount(() => {
      initLogoStore(); 
      
      const id = $page.params.id;
      
      if (!id) {
        error = 'ID du document non trouvé';
        loading = false;
        goto('/');
        return;
      }
      
      try {
        invoice = getInvoiceById(id) ?? null;
        
        if (!invoice) {
          error = 'Document non trouvé';
          loading = false;
          setTimeout(() => goto('/'), 2000);
          return;
        }
        
        subtotal = calculateSubtotal(invoice.items);
        discountAmount = invoice.discount ? calculateDiscount(invoice.items, invoice.discount) : 0;
        tax = calculateTax(invoice.items, invoice.taxRate, invoice.discount);
        advancePaymentAmount = invoice.advancePayment ? calculateAdvancePayment(invoice.items, invoice.advancePayment) : 0;
        total = calculateTotal(
          invoice.items, 
          invoice.taxRate, 
          invoice.discount,
          invoice.advancePayment
        );
        
        if (invoice?.client?.email) {
          emailTo = invoice.client.email;
          const documentType = invoice.documentType === 'facture' ? 'Facture' : 'Devis';
          emailSubject = `${documentType} ${invoice.documentNumber}`;
          emailMessage = `Bonjour ${invoice.client.name},\n\nVeuillez trouver ci-joint ${documentType.toLowerCase()} N°${invoice.documentNumber}.\n\nCordialement,\n${invoice.provider.name}`;
        }
      } catch (err) {
        error = err instanceof Error ? err.message : 'Erreur inconnue';
        console.error('Erreur lors du chargement du document:', err);
      } finally {
        loading = false;
      }
    });
    
    const downloadPDF = () => {
      if (!invoice) return;
      
      try {
        generateInvoicePDF(invoice);
        showSuccessToast('Document PDF généré avec succès');
      } catch (err) {
        console.error('Erreur lors de la génération du PDF:', err);
        showErrorToast(`Erreur lors de la génération du PDF: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    };
    
    const openEmailModal = () => {
      showEmailModal = true;
    };
    
    const closeEmailModal = () => {
      showEmailModal = false;
    };
    
    const handleSendEmail = () => {
      if (!invoice || !emailTo) return;
      
      try {
        sendInvoiceByEmail(invoice.id, emailTo, emailSubject, emailMessage);
        showEmailModal = false;
        showSuccessToast('Email ouvert dans votre client de messagerie par défaut');
      } catch (err) {
        console.error('Erreur lors de l\'envoi de l\'email:', err);
        showErrorToast(`Erreur lors de l'envoi de l'email: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      }
    };

    const showSuccessToast = (message: string) => {
      if (toastTimer) clearTimeout(toastTimer);
      toastMessage = message;
      toastType = 'success';
      showToast = true;
      toastTimer = setTimeout(() => { showToast = false; }, 3000);
    };

    const showErrorToast = (message: string) => {
      if (toastTimer) clearTimeout(toastTimer);
      toastMessage = message;
      toastType = 'error';
      showToast = true;
      toastTimer = setTimeout(() => { showToast = false; }, 5000);
    };
  </script>
  
  <svelte:head>
    <title>{invoice?.documentType === 'facture' ? 'Facture' : 'Devis'} {invoice?.documentNumber}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </svelte:head>
  
  <main class="container mx-auto p-4 max-w-4xl">
    {#if loading}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    {:else if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
        <strong class="font-bold">Erreur!</strong>
        <span class="block sm:inline ml-1">{error}</span>
        <p class="mt-2">Redirection vers la page d'accueil...</p>
      </div>
    {:else if invoice}
      <div class="mb-4 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 class="text-2xl sm:text-3xl font-bold text-blue-800">
          {invoice.documentType === 'facture' ? 'Facture' : 'Devis'} {invoice.documentNumber}
        </h1>
        <div class="flex flex-wrap gap-2">
          <button 
            class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
            on:click={() => goto('/')}
          >
            Retour
          </button>
          <button 
            class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
            on:click={downloadPDF}
          >
            PDF
          </button>
          <!-- <button 
            class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
            on:click={openEmailModal}
          >
            Email
          </button> -->
          <button 
            class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
            on:click={() => goto(`/create?edit=${invoice?.id}`)}
          >
            Modifier
          </button>
        </div>
      </div>
      
      <div class="bg-white shadow-md rounded-lg p-4 sm:p-6">
        <!-- En-tête du document -->
        <div class="mb-6 flex flex-col md:flex-row justify-between items-center">
          <div class="flex items-center mb-4 md:mb-0">
            {#if $logoStore}
              <img src={$logoStore} alt="Logo" class="max-h-16 mr-4 object-contain" />
            {/if}
            <div>
              <h2 class="text-xl sm:text-2xl font-bold">
                {invoice.documentType === 'facture' ? 'FACTURE' : 'DEVIS'} N° {invoice.documentNumber}
              </h2>
            </div>
          </div>
        </div>
        
        <!-- Informations prestataire et client -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div class="bg-gray-50 p-3 sm:p-4 rounded">
            <h3 class="font-bold mb-2 text-blue-800">DE:</h3>
            <p class="font-semibold">{invoice.provider.name}</p>
            <p class="text-sm sm:text-base break-words">{invoice.provider.address}</p>
            <p class="text-sm sm:text-base">SIRET: {invoice.provider.siret}</p>
            {#if invoice.provider.tvaNumber}
              <p class="text-sm sm:text-base">N° TVA: {invoice.provider.tvaNumber}</p>
            {/if}
            <p class="text-sm sm:text-base break-words">Email: {invoice.provider.email}</p>
            {#if invoice.provider.phone}
              <p class="text-sm sm:text-base">Tél: {invoice.provider.phone}</p>
            {/if}
          </div>
          
          <div class="bg-gray-50 p-3 sm:p-4 rounded">
            <h3 class="font-bold mb-2 text-blue-800">POUR:</h3>
            <p class="font-semibold">{invoice.client.name}</p>
            <p class="text-sm sm:text-base break-words">{invoice.client.address}</p>
            <p class="text-sm sm:text-base break-words">Email: {invoice.client.email}</p>
            {#if invoice.client.phone}
              <p class="text-sm sm:text-base">Tél: {invoice.client.phone}</p>
            {/if}
          </div>
        </div>
        
        <!-- Dates -->
        <div class="bg-gray-50 p-3 sm:p-4 rounded mb-6">
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div>
              <p class="text-sm text-gray-500">Date d'émission</p>
              <p class="font-semibold">{new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</p>
            </div>
            <div>
              <p class="text-sm text-gray-500">Date d'échéance</p>
              <p class="font-semibold">{new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
          
          {#if invoice.documentType === 'facture' && invoice.quotationId}
            <p>
              <span class="font-semibold">Référence devis:</span> 
              {invoice.quotationId}
            </p>
          {/if}
        </div>
        
        <!-- Mode de paiement -->
        {#if invoice.paymentMethod}
          <div class="bg-gray-50 p-3 sm:p-4 rounded mb-6">
            <p class="text-sm text-gray-500">Mode de paiement</p>
            <p class="font-semibold">{invoice.paymentMethod}</p>
          </div>
        {/if}
        
        <!-- Tableau des prestations -->
        <div class="mb-6">
          <h3 class="font-bold mb-3 text-blue-800">PRESTATIONS</h3>
          <div class="overflow-x-auto">
            <table class="min-w-full">
              <thead>
                <tr class="bg-gray-100">
                  <th class="py-2 px-3 text-left">Description</th>
                  <th class="py-2 px-3 text-left">Qté</th>
                  <th class="py-2 px-3 text-left">Prix unitaire</th>
                  <th class="py-2 px-3 text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                {#each invoice.items as item}
                  <tr class="border-b">
                    <td class="py-2 px-3 text-sm sm:text-base">{item.description}</td>
                    <td class="py-2 px-3 text-sm sm:text-base">{item.quantity}</td>
                    <td class="py-2 px-3 text-sm sm:text-base">{item.unitPrice.toFixed(2)} €</td>
                    <td class="py-2 px-3 text-sm sm:text-base">{(item.quantity * item.unitPrice).toFixed(2)} €</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Totaux -->
        <div class="flex justify-end mb-6">
          <div class="w-full sm:w-64 bg-gray-50 p-3 rounded">
            <div class="flex justify-between mb-2">
              <span>Montant HT:</span>
              <span>{subtotal.toFixed(2)} €</span>
            </div>
            
            {#if invoice.discount && invoice.discount > 0}
              <div class="flex justify-between mb-2 text-red-600">
                <span>Remise ({invoice.discount}%):</span>
                <span>-{discountAmount.toFixed(2)} €</span>
              </div>
            {/if}
            
            {#if invoice.taxRate > 0}
              <div class="flex justify-between mb-2">
                <span>TVA ({invoice.taxRate}%):</span>
                <span>{tax.toFixed(2)} €</span>
              </div>
            {/if}
            
            {#if invoice.advancePayment && invoice.advancePayment > 0}
              <div class="flex justify-between py-1 border-b">
                <span>Accompte versé:</span>
                <span class="font-medium text-red-600">-{advancePaymentAmount.toFixed(2)} €</span>
              </div>
            {/if}
            
            <div class="flex justify-between font-bold text-lg border-t pt-2">
              <span>Montant TTC:</span>
              <span>{total.toFixed(2)} €</span>
            </div>
          </div>
        </div>
        
        <!-- Notes -->
        {#if invoice.notes}
          <div class="mb-4 bg-gray-50 p-3 sm:p-4 rounded">
            <h3 class="font-bold mb-2 text-blue-800">NOTES</h3>
            <p class="whitespace-pre-line text-sm sm:text-base">{invoice.notes}</p>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Toast de notification -->
    {#if showToast}
      <div class="fixed bottom-4 right-4 z-50 {toastType === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white p-4 rounded-lg shadow-lg max-w-xs md:max-w-md">
        <div class="flex items-center">
          {#if toastType === 'success'}
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
          {:else}
            <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          {/if}
          <p class="text-sm">{toastMessage}</p>
        </div>
      </div>
    {/if}
  </main>
  
  <!-- Modal d'envoi d'email - rendu responsive -->
  {#if showEmailModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Envoyer par email</h2>
        
        <div class="mb-4">
          <label class="block text-gray-700 mb-2" for="email-to">Destinataire</label>
          <input 
            id="email-to"
            type="email" 
            class="w-full px-3 py-2 border rounded-lg" 
            bind:value={emailTo} 
            placeholder="email@exemple.com"
          />
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 mb-2" for="email-subject">Objet</label>
          <input 
            id="email-subject"
            type="text" 
            class="w-full px-3 py-2 border rounded-lg" 
            bind:value={emailSubject}
          />
        </div>
        
        <div class="mb-4">
          <label class="block text-gray-700 mb-2" for="email-message">Message</label>
          <textarea 
            id="email-message"
            class="w-full px-3 py-2 border rounded-lg h-32" 
            bind:value={emailMessage}
          ></textarea>
        </div>
        
        <div class="flex flex-col sm:flex-row justify-end gap-2">
          <button 
            class="px-4 py-2 bg-gray-300 rounded-lg order-2 sm:order-1"
            on:click={closeEmailModal}
          >
            Annuler
          </button>
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg order-1 sm:order-2"
            on:click={handleSendEmail}
            disabled={!emailTo}
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  {/if}
  
  <style>
    /* Styles responsifs supplémentaires si nécessaires */
    @media (max-width: 640px) {
      table {
        font-size: 0.875rem;
      }
    }
  </style> 