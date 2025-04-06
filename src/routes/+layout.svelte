<script>
    import '../app.postcss'; // Pour Tailwind CSS
  </script>
  
  <div class="min-h-screen bg-gray-100">
    <header class="bg-blue-800 text-white p-4 shadow-md">
      <div class="container mx-auto flex justify-between items-center">
        <div class="text-xl font-bold">FacturePro</div>
      </div>
    </header>
    
    <slot />
    
    <footer class="bg-gray-200 p-4 text-center text-gray-600 mt-10">
      <p>© {new Date().getFullYear()} - Application de gestion de factures</p>
    </footer>
  </div>