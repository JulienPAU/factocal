<script>
  import { goto } from '$app/navigation';
</script>

<svelte:head>
  <title>À propos - Gestionnaire de Factures</title>
  <meta name="description" content="Informations à propos de l'application Gestionnaire de Factures" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</svelte:head>

<main class="container mx-auto p-4 max-w-3xl">
  <h1 class="text-3xl font-bold text-blue-800 mb-6">À propos de l'application</h1>
  
  <div class="bg-white shadow-md rounded-lg p-6 mb-8">
    <h2 class="text-xl font-bold mb-4">Gestionnaire de Factures</h2>
    <p class="mb-4">Cette application vous permet de créer, gérer et suivre vos factures et devis simplement et efficacement. Elle est conçue pour les auto-entrepreneurs, freelances et petites entreprises.</p>
    
    <h3 class="text-lg font-bold mt-6 mb-2">Fonctionnalités principales</h3>
    <ul class="list-disc ml-6 space-y-2">
      <li>Création de factures et devis personnalisés</li>
      <li>Ajout de votre logo</li>
      <li>Gestion des remises</li>
      <li>Conversion des devis en factures</li>
      <li>Export en PDF et JSON</li>
      <li>Numérotation séquentielle automatique</li>
      <li>Envoi par email</li>
    </ul>
    
    <h3 class="text-lg font-bold mt-6 mb-2">Stockage local</h3>
    <p class="mb-2">Toutes vos données sont stockées localement dans votre navigateur (localStorage). Cela signifie que :</p>
    <ul class="list-disc ml-6 space-y-2">
      <li>Vos données restent privées et ne sont pas envoyées à un serveur distant</li>
      <li>Vous pouvez utiliser l'application même sans connexion internet</li>
      <li><span class="font-semibold">Important :</span> Si vous videz le cache de votre navigateur, vos données seront perdues</li>
    </ul>
    
    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
      <p class="text-yellow-800">
        <span class="font-bold">Conseil :</span> Exportez régulièrement vos données au format JSON en cliquant sur "Options > Exporter JSON" pour éviter toute perte de données.
      </p>
    </div>
    
    <h3 class="text-lg font-bold mt-6 mb-2">Utiliser sur plusieurs appareils</h3>
    <p class="mb-2">Pour utiliser vos données sur un autre appareil :</p>
    <ol class="list-decimal ml-6 space-y-2">
      <li>Sur votre appareil actuel, exportez vos données au format JSON</li>
      <li>Transférez le fichier JSON sur votre nouvel appareil</li>
      <li>Sur le nouvel appareil, importez le fichier JSON via "Options > Importer JSON"</li>
      <li>N'oubliez pas de réimporter votre logo si vous en utilisez un</li>
    </ol>
    
    <h3 class="text-lg font-bold mt-6 mb-2">À propos des numéros de documents</h3>
    <p class="mb-2">Les numéros de factures et devis sont générés automatiquement selon le format :</p>
    <p class="font-mono bg-gray-100 p-2 rounded">FAC/DEV-ANNÉE-JOUR-SÉQUENCE</p>
    <p class="mt-2 mb-4">Ce format garantit une numérotation séquentielle claire et cohérente de vos documents.</p>
    
    <h3 class="text-lg font-bold mt-6 mb-2">Gestion de logos</h3>
    <p>Vous pouvez ajouter votre logo d'entreprise qui sera affiché sur vos factures et devis. Notez que :</p>
    <ul class="list-disc ml-6 space-y-2">
      <li>Le logo est stocké dans le navigateur local</li>
      <li>Formats supportés : JPG, PNG, SVG, GIF, WEBP</li>
      <li>Taille maximale : 500KB</li>
      <li>Si vous changez d'appareil, vous devrez réimporter votre logo</li>
    </ul>
    
    <h3 class="text-lg font-bold mt-6 mb-2">Développement</h3>
    <p>Cette application a été développée par Julien Paulus. Elle utilise les technologies suivantes :</p>
    <ul class="list-disc ml-6 space-y-1">
      <li>Svelte et SvelteKit</li>
      <li>TypeScript</li>
      <li>Tailwind CSS</li>
      <li>jsPDF pour la génération de PDF</li>
    </ul>
  </div>
  
  <div class="text-center mb-8">
    <button 
      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
      on:click={() => goto('/')}
    >
      Retour à l'accueil
    </button>
  </div>
</main>

<style>
  /* Styles spécifiques si nécessaire */
</style> 