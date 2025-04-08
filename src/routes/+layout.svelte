<script>
    import '../app.postcss'; // Pour Tailwind CSS
  </script>
  
  <div class="min-h-screen bg-gray-100 flex flex-col justify-between">
    <header class="bg-blue-800 text-white p-4 shadow-md">
      <div class="container mx-auto flex justify-between items-center">
        <a href="/" class="text-xl font-bold">Factocal, stockage local pour vos factures</a>
      </div>
    </header>
    
    <slot />
    
    <footer class="bg-gray-200 p-4 text-center text-gray-600 mt-10 flex justify-center items-center">
      <p>© {new Date().getFullYear()} - Application de gestion de factures</p>
      <a href="https://www.julienpaulus.fr/" target="_blank"><img src="/logo_new.svg" alt="logo" class="w-[3.5rem]"></a>
    </footer>
  </div>