<script lang="ts">
  import { onMount } from 'svelte';
  import { logoStore, saveLogo, removeLogo, initLogoStore, imageToBase64, validateImage } from '$lib/utils/logoStorage';
  
  // État local
  let logoInput: HTMLInputElement;
  let dragActive = false;
  let errorMessage = '';
  let showSettings = false;
  
  // Initialiser le store du logo
  onMount(() => {
    initLogoStore();
  });
  
  // Gérer l'import du logo
  const handleLogoUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    
    const file = target.files[0];
    errorMessage = '';
    
    try {
      // Valider l'image
      validateImage(file);
      
      // Convertir l'image en base64
      const base64Logo = await imageToBase64(file);
      
      // Sauvegarder l'image
      saveLogo(base64Logo);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Erreur lors du téléchargement";
    }
    
    // Réinitialiser l'input
    target.value = '';
  };
  
  // Supprimer le logo actuel
  const handleRemoveLogo = () => {
    if (confirm('Êtes-vous sûr de vouloir supprimer le logo ?')) {
      removeLogo();
    }
  };
  
  // Fonctions pour le drag and drop
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActive = true;
  };
  
  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActive = false;
  };
  
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActive = true;
  };
  
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragActive = false;
    
    if (!e.dataTransfer || !e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    
    const file = e.dataTransfer.files[0];
    errorMessage = '';
    
    try {
      // Valider l'image
      validateImage(file);
      
      // Convertir l'image en base64
      const base64Logo = await imageToBase64(file);
      
      // Sauvegarder l'image
      saveLogo(base64Logo);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Erreur lors du téléchargement";
    }
  };
  
  // Déclencher le clic sur l'input file
  const triggerLogoInput = () => {
    logoInput.click();
  };
  
  // Ouvrir/fermer les paramètres
  const toggleSettings = () => {
    showSettings = !showSettings;
  };
  
  // Appliquer les changements
  const applySettings = () => {
    // No changes to apply
  };
</script>

<div class="space-y-4">
  <!-- Logo actuel ou zone de drop -->
  {#if $logoStore}
    <div class="relative flex flex-col items-center">
      <div class="mb-2 relative">
        <img 
          src={$logoStore} 
          alt="Logo" 
          style="width: 150px; height: auto; object-fit: contain;"
        />
        <button 
          type="button"
          class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
          on:click={handleRemoveLogo}
          title="Supprimer le logo"
        >
          ✕
        </button>
      </div>
      <p class="text-sm text-gray-500">Le logo sera affiché sur vos factures avec une taille optimale.</p>
      <input 
        bind:this={logoInput}
        type="file" 
        accept="image/jpeg,image/png,image/svg+xml,image/gif,image/webp" 
        class="hidden" 
        on:change={handleLogoUpload} 
      />
      
      <button 
        type="button"
        class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm mt-3"
        on:click={triggerLogoInput}
      >
        Changer de logo
      </button>
    </div>
  {:else}
    <div 
      class="border-2 border-dashed p-4 rounded-lg flex flex-col items-center justify-center min-h-[100px] text-center cursor-pointer transition-colors {dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}"
      on:click={triggerLogoInput}
      on:dragenter={handleDragEnter}
      on:dragleave={handleDragLeave}
      on:dragover={handleDragOver}
      on:drop={handleDrop}
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-sm">Glissez votre logo ici ou cliquez pour télécharger</p>
      <p class="text-xs text-gray-500 mt-1">Formats acceptés: JPG, PNG, SVG, GIF, WEBP (max 500KB)</p>
    </div>
  {/if}
  
  <!-- Message d'erreur -->
  {#if errorMessage}
    <div class="text-red-500 text-sm mt-2">{errorMessage}</div>
  {/if}
  
  <input 
    bind:this={logoInput}
    type="file" 
    accept="image/jpeg,image/png,image/svg+xml,image/gif,image/webp" 
    class="hidden" 
    on:change={handleLogoUpload} 
  />
</div> 