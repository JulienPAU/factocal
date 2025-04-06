<script lang="ts">
  import { onMount } from 'svelte';
  import { invoices } from '$lib/stores/invoiceStore';
  import { calculateTotal } from '$lib/types/invoice';
  import { goto } from '$app/navigation';
  import { 
    exportInvoiceToJson, 
    exportInvoiceToPdf,
    exportAllInvoicesToJson, 
    importInvoiceFromJson,
    confirmInvoiceImport
  } from '$lib/utils/storage';
  import type { Invoice } from '$lib/types/invoice';

  // Filtres
  let filter = 'all'; // 'all', 'facture', 'devis'
  let searchTerm = "";
  
  // Référence à l'élément input file (caché)
  let fileInput: HTMLInputElement;

  // État pour le modal de détection de doublons
  let showDuplicatesModal = false;
  let duplicates: Invoice[] = [];
  let currentInvoice: Invoice | null = null;

  // État pour le menu d'options
  let showOptionsMenu = false;

  // États pour le modal d'accueil
  let showWelcomeModal = false;
  let newUserInfo = {
    name: '',
    address: '',
    email: '',
    phone: '',
    siret: '',
    tvaNumber: ''
  };

  // Fonction pour fermer le menu d'options quand on clique ailleurs
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Si on clique ailleurs que sur le menu ou le bouton, fermer le menu
    if (showOptionsMenu && !target.closest('.options-menu') && !target.closest('.options-button')) {
      showOptionsMenu = false;
    }
  }

  // Initialiser le store au chargement de la page
  onMount(() => {
    // Gestionnaire déjà présent
    invoices.init();
    
    // Initialiser les éléments d'input
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.json';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', handleJsonImport);
      document.body.appendChild(fileInput);
    }
    
    // Ajouter l'écouteur pour fermer le menu quand on clique ailleurs
    document.addEventListener('click', handleClickOutside);
    
    // Vérifier s'il existe déjà des informations de prestataire
    const providerInfo = localStorage.getItem('provider_info');
    
    // Si c'est la première visite ou pas d'infos prestataire, montrer le message d'accueil
    if (!providerInfo) {
      showWelcomeModal = true;
    }
    
    // Nettoyer à la destruction du composant
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  });

  // Liste filtrée avec recherche
  $: filteredInvoices = $invoices.filter((invoice) => {
    // Filtre par type de document
    const matchesType = filter === 'all' || invoice.documentType === filter;
    
    // Filtre par terme de recherche
    const matchesSearch = searchTerm === "" || 
      invoice.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      invoice.client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      invoice.documentType.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesSearch;
  }).sort((a, b) => {
    // Tri par date (plus récent en premier)
    return new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
  });
  
  // Conversion d'un devis en facture
  const handleConvertToInvoice = (id: string) => {
    invoices.convertToInvoice(id);
    showSuccessToast('Devis converti en facture avec succès!');
  };
  
  // Supprimer un document
  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce document?')) {
      invoices.remove(id);
      showSuccessToast('Document supprimé avec succès');
    }
  };

  // Exporter un document en JSON
  const handleExportJson = (id: string) => {
    exportInvoiceToJson(id);
    showSuccessToast('Document exporté en JSON avec succès');
  };

  // Exporter un document en PDF
  const handleExportPdf = (id: string) => {
    exportInvoiceToPdf(id);
    showSuccessToast('Document exporté en PDF avec succès');
  };

  // Exporter tous les documents (ou filtrés par type)
  const handleExportAllJson = (type: 'all' | 'facture' | 'devis' = 'all') => {
    exportAllInvoicesToJson(type);
    if (type === 'all') {
      showSuccessToast('Tous les documents exportés avec succès');
    } else {
      showSuccessToast(`Tous les ${type === 'facture' ? 'factures' : 'devis'} exportés avec succès`);
    }
  };

  // Déclencher le clic sur l'input file JSON
  const triggerJsonFileInput = () => {
    fileInput.click();
  };

  // Gérer l'import de fichier JSON
  const handleJsonImport = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];
    if (file.type !== 'application/json') {
      showErrorToast('Veuillez sélectionner un fichier JSON');
      return;
    }

    // Afficher un message de chargement
    showLoadingToast("Importation du fichier JSON en cours...");

    const result = await importInvoiceFromJson(file);
    
    if (!result.id) {
      hideToast();
      showErrorToast('Erreur lors de l\'importation du document. Vérifiez que le format est correct.');
      target.value = '';
      return;
    }
    
    // Vérifier s'il y a des doublons
    if (result.duplicates.length > 0) {
      // Afficher le modal de confirmation
      currentInvoice = $invoices.find(inv => inv.id === result.id) || null;
      duplicates = result.duplicates;
      showDuplicatesModal = true;
      hideToast();
    } else {
      // Recharger les factures et afficher un message de succès
      invoices.init();
      hideToast();
      showSuccessToast('Documents importés avec succès!');
    }

    // Réinitialiser l'input pour permettre de sélectionner à nouveau le même fichier
    target.value = '';
  };

  // Fermer le modal de détection de doublons
  const closeDuplicatesModal = () => {
    showDuplicatesModal = false;
    // On ne supprime pas la facture ici car ça empêche de l'importer plus tard
  };

  // Confirmer l'importation malgré les doublons
  const confirmImport = () => {
    if (currentInvoice) {
      confirmInvoiceImport(currentInvoice.id);
      showDuplicatesModal = false;
      invoices.init();
      showSuccessToast('Documents importés avec succès!');
    }
  };

  // Toast notifications
  let showToast = false;
  let toastMessage = '';
  let toastType: 'success' | 'error' | 'loading' = 'success';
  let toastTimeout: ReturnType<typeof setTimeout> | null = null;

  const showSuccessToast = (message: string) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMessage = message;
    toastType = 'success';
    showToast = true;
    toastTimeout = setTimeout(() => {
      showToast = false;
    }, 3000);
  };

  const showErrorToast = (message: string) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMessage = message;
    toastType = 'error';
    showToast = true;
    toastTimeout = setTimeout(() => {
      showToast = false;
    }, 5000);
  };

  const showLoadingToast = (message: string) => {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastMessage = message;
    toastType = 'loading';
    showToast = true;
  };

  const hideToast = () => {
    if (toastTimeout) clearTimeout(toastTimeout);
    showToast = false;
  };

  // Sauvegarder les informations du prestataire
  const saveProviderInfo = () => {
    if (!newUserInfo.name || !newUserInfo.siret) {
      showErrorToast('Veuillez au moins renseigner le nom et le SIRET');
      return;
    }
    
    localStorage.setItem('provider_info', JSON.stringify({
      name: newUserInfo.name,
      address: newUserInfo.address,
      email: newUserInfo.email,
      phone: newUserInfo.phone,
      siret: newUserInfo.siret,
      tvaNumber: newUserInfo.tvaNumber
    }));
    
    showWelcomeModal = false;
    showSuccessToast('Vos informations ont été enregistrées avec succès');
  };

  // Ignorer le message d'accueil
  const skipWelcomeModal = () => {
    showWelcomeModal = false;
  };

  // Exporter les infos prestataire
  const exportProviderInfo = () => {
    const providerInfo = localStorage.getItem('provider_info');
    if (!providerInfo) {
      showErrorToast('Aucune information prestataire à exporter');
      return;
    }
    
    const fileData = providerInfo;
    const blob = new Blob([fileData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "infos-prestataire.json";
    link.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
    showSuccessToast('Informations exportées avec succès');
  };

  // Importer les infos prestataire
  const importProviderInfo = (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    
    const file = target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const providerData = JSON.parse(content);
        
        if (!providerData.name || !providerData.siret) {
          showErrorToast('Fichier invalide: informations prestataire incomplètes');
          return;
        }
        
        localStorage.setItem('provider_info', content);
        showSuccessToast('Informations prestataire importées avec succès');
      } catch (error) {
        showErrorToast('Erreur lors de l\'importation des informations');
      }
      
      target.value = '';
    };
    
    reader.readAsText(file);
  };
  
  // Référence à l'input file pour importer les infos prestataire
  let providerInfoInput: HTMLInputElement;
  
  // Déclencher l'input file pour importer des infos prestataire
  const triggerProviderInfoInput = () => {
    providerInfoInput?.click();
  };
</script>

<svelte:head>
  <title>Gestionnaire de Factures</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</svelte:head>

<main class="container mx-auto p-4 max-w-4xl">
  <!-- En-tête responsive -->
  <header class="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <h1 class="text-2xl sm:text-3xl font-bold text-blue-800">Gestionnaire de Factures</h1>
    <div class="flex flex-wrap gap-2">
      <button
        class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
        on:click={() => goto('/create')}
      >
        Nouveau Document
      </button>
      <div class="relative">
        <button
          class="options-button bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
          on:click={(e) => {
            e.stopPropagation();
            showOptionsMenu = !showOptionsMenu;
          }}
        >
          Options ▼
        </button>
        {#if showOptionsMenu}
          <div class="options-menu absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
            <div class="py-1">
              <button 
                class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                on:click={() => {
                  triggerJsonFileInput();
                  showOptionsMenu = false;
                }}
              >
                Importer JSON
              </button>
              <button 
                class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                on:click={() => {
                  handleExportAllJson('all');
                  showOptionsMenu = false;
                }}
              >
                Tout exporter
              </button>
              <button 
                class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                on:click={() => {
                  handleExportAllJson('facture');
                  showOptionsMenu = false;
                }}
              >
                Exporter factures
              </button>
              <button 
                class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                on:click={() => {
                  handleExportAllJson('devis');
                  showOptionsMenu = false;
                }}
              >
                Exporter devis
              </button>
              <div class="border-t border-gray-200 my-1"></div>
              <button 
                class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                on:click={() => {
                  exportProviderInfo();
                  showOptionsMenu = false;
                }}
              >
                Exporter infos prestataire
              </button>
              <button 
                class="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                on:click={() => {
                  triggerProviderInfoInput();
                  showOptionsMenu = false;
                }}
              >
                Importer infos prestataire
              </button>
            </div>
          </div>
        {/if}
      </div>
      <button
        class="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base"
        on:click={() => goto('/about')}
      >
        À propos
      </button>
    </div>
  </header>
  
  <div class="bg-white shadow-md rounded-lg p-4 md:p-6">
    <!-- Barre de recherche et filtres -->
    <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div class="w-full sm:w-auto flex-grow">
        <input
          type="text"
          placeholder="Rechercher..."
          class="w-full px-4 py-2 border rounded-lg"
          bind:value={searchTerm}
        />
      </div>
      <div class="flex space-x-2">
        <button
          class="px-3 py-1 rounded-lg {filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}"
          on:click={() => { filter = "all"; }}
        >
          Tous
        </button>
        <button
          class="px-3 py-1 rounded-lg {filter === 'facture' ? 'bg-blue-600 text-white' : 'bg-gray-200'}"
          on:click={() => { filter = "facture"; }}
        >
          Factures
        </button>
        <button
          class="px-3 py-1 rounded-lg {filter === 'devis' ? 'bg-blue-600 text-white' : 'bg-gray-200'}"
          on:click={() => { filter = "devis"; }}
        >
          Devis
        </button>
      </div>
    </div>

    <!-- Tableau des documents -->
    {#if filteredInvoices.length > 0}
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse">
          <thead>
            <tr class="bg-gray-100">
              <th class="py-2 px-3 text-left text-xs sm:text-sm">Type</th>
              <th class="hidden sm:table-cell py-2 px-3 text-left text-xs sm:text-sm">N°</th>
              <th class="py-2 px-3 text-left text-xs sm:text-sm">Client</th>
              <th class="hidden sm:table-cell py-2 px-3 text-left text-xs sm:text-sm">Date</th>
              <th class="hidden sm:table-cell py-2 px-3 text-left text-xs sm:text-sm">Montant</th>
              <th class="py-2 px-3 text-left text-xs sm:text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredInvoices as invoice}
              <tr class="border-b hover:bg-gray-50">
                <td class="py-2 px-3 text-xs sm:text-sm">
                  <span class="inline-block px-2 py-1 rounded {invoice.documentType === 'facture' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    {invoice.documentType === 'facture' ? 'F' : 'D'}
                  </span>
                </td>
                <td class="hidden sm:table-cell py-2 px-3 text-xs sm:text-sm font-medium">{invoice.documentNumber}</td>
                <td class="py-2 px-3 text-xs sm:text-sm font-medium">{invoice.client.name}</td>
                <td class="hidden sm:table-cell py-2 px-3 text-xs sm:text-sm">{new Date(invoice.issueDate).toLocaleDateString('fr-FR')}</td>
                <td class="hidden sm:table-cell py-2 px-3 text-xs sm:text-sm">
                  {calculateTotal(invoice.items, invoice.taxRate, invoice.discount).toFixed(2)} €
                </td>
                <td class="py-2 px-3 text-xs sm:text-sm">
                  <div class="flex space-x-1">
                    <button
                      class="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      on:click={() => goto(`/view/${invoice.id}`)}
                      title="Voir"
                    >
                      👁️
                    </button>
                    <button
                      class="p-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      on:click={() => goto(`/create?edit=${invoice.id}`)}
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    {#if invoice.documentType === 'devis' && !invoice.convertedToInvoice}
                      <button
                        class="p-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        on:click={() => handleConvertToInvoice(invoice.id)}
                        title="Convertir en facture"
                      >
                        📑
                      </button>
                    {/if}
                    <button
                      class="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                      on:click={() => handleDelete(invoice.id)}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <div class="text-center py-8">
        <p class="text-gray-500">Aucun document trouvé</p>
        {#if searchTerm || filter !== 'all'}
          <p class="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
        {:else}
          <p class="text-gray-400 text-sm mt-2">Créez votre premier document en cliquant sur "Nouveau Document"</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Modal pour les doublons -->
  {#if showDuplicatesModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 class="text-xl font-bold mb-4">Documents similaires détectés</h2>
        
        <p class="mb-4">Le document que vous importez semble similaire à d'autres documents existants :</p>
        
        <div class="mb-4 max-h-60 overflow-y-auto">
          {#each duplicates as duplicate}
            <div class="p-3 mb-2 border rounded bg-yellow-50">
              <p><strong>{duplicate.documentType === 'facture' ? 'Facture' : 'Devis'} #{duplicate.documentNumber}</strong></p>
              <p class="text-sm">Client: {duplicate.client.name}</p>
              <p class="text-sm">Date: {new Date(duplicate.issueDate).toLocaleDateString('fr-FR')}</p>
            </div>
          {/each}
        </div>
        
        <p class="mb-4">Voulez-vous continuer l'importation ?</p>
        
        <div class="flex flex-col sm:flex-row justify-end gap-2">
          <button 
            class="px-4 py-2 bg-gray-300 rounded-lg order-2 sm:order-1"
            on:click={closeDuplicatesModal}
          >
            Annuler
          </button>
          <button 
            class="px-4 py-2 bg-blue-600 text-white rounded-lg order-1 sm:order-2"
            on:click={confirmImport}
          >
            Importer quand même
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Modal d'accueil -->
  {#if showWelcomeModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 class="text-xl font-bold mb-4">Bienvenue sur votre gestionnaire de factures!</h2>
        <p class="mb-4">Pour commencer, vous pouvez configurer vos informations de prestataire qui seront utilisées dans vos documents.</p>
        
        <div class="space-y-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Nom / Entreprise*</label>
            <input type="text" bind:value={newUserInfo.name} class="w-full p-2 border rounded" placeholder="Votre nom ou raison sociale">
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
            <input type="text" bind:value={newUserInfo.address} class="w-full p-2 border rounded" placeholder="Votre adresse">
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" bind:value={newUserInfo.email} class="w-full p-2 border rounded" placeholder="Email">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input type="text" bind:value={newUserInfo.phone} class="w-full p-2 border rounded" placeholder="Téléphone">
            </div>
          </div>
          
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">SIRET*</label>
              <input type="text" bind:value={newUserInfo.siret} class="w-full p-2 border rounded" placeholder="SIRET">
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">N° TVA</label>
              <input type="text" bind:value={newUserInfo.tvaNumber} class="w-full p-2 border rounded" placeholder="Numéro TVA si applicable">
            </div>
          </div>
        </div>
        
        <div class="flex justify-between">
          <button 
            class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
            on:click={skipWelcomeModal}
          >
            Plus tard
          </button>
          
          <button 
            class="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            on:click={saveProviderInfo}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Input file caché pour l'import d'infos prestataire -->
  <input
    bind:this={providerInfoInput}
    type="file"
    accept="application/json"
    class="hidden"
    on:change={importProviderInfo}
  />

  <!-- Toast de notification -->
  {#if showToast}
    <div class="fixed bottom-4 right-4 z-50 {toastType === 'success' ? 'bg-green-500' : toastType === 'error' ? 'bg-red-500' : 'bg-blue-500'} text-white p-4 rounded-lg shadow-lg max-w-xs sm:max-w-md">
      <div class="flex items-center">
        {#if toastType === 'success'}
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        {:else if toastType === 'error'}
          <svg class="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        {:else}
          <div class="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
        {/if}
        <p class="text-sm">{toastMessage}</p>
      </div>
    </div>
  {/if}
</main>
