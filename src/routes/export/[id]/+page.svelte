<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { getInvoiceById } from '$lib/utils/storage';
  import { generateInvoicePDF } from '$lib/utils/generatePDF';
  import type { Invoice } from '$lib/types/invoice';
  
  export let data: Record<string, unknown>;
  
  let invoice: Invoice | null = null;
  let loading = true;
  let error: string | null = null;
  
  onMount(() => {
    const id = $page.params.id;
    
    if (!id) {
      error = 'ID du document non trouvé';
      loading = false;
      return;
    }
    
    try {
      const result = getInvoiceById(id);
      
      if (!result) {
        error = 'Document non trouvé';
        loading = false;
        return;
      }
      
      invoice = result;
      
      generateInvoicePDF(invoice);
      
      setTimeout(() => {
        goto('/');
      }, 1000);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Erreur lors de l\'export du document:', err);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Export du document {$page.params.id}</title>
</svelte:head>

<div class="container mx-auto p-4 max-w-xl text-center">
  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Erreur!</strong>
      <span class="block sm:inline ml-1">{error}</span>
      <p class="mt-2">
        <button 
          class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          on:click={() => goto('/')}
        >
          Retour à l'accueil
        </button>
      </p>
    </div>
  {:else if invoice}
    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
      <strong class="font-bold">Succès!</strong>
      <span class="block sm:inline ml-1">Le document est en cours d'export...</span>
      <p class="mt-2">Redirection vers la page d'accueil...</p>
    </div>
  {/if}
</div>

       