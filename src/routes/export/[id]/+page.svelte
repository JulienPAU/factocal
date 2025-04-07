          <!-- Mode de paiement -->
          {#if invoice.paymentMethod}
            <div class="mb-4">
              <p class="font-semibold">Mode de paiement:</p>
              <p>{invoice.paymentMethod}</p>
            </div>
          {/if}
          
          <!-- Notes --> 