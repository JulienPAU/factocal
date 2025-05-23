<script lang="ts">
  import { onMount } from 'svelte';
  import * as ValidationUtils from './ValidationUtils';
  
  export let type: 'text' | 'email' | 'tel' | 'number' | 'siret' | 'vat' = 'text';
  export let value: string | number;
  export let placeholder = '';
  export let label = '';
  export let required = false;
  export let readonly = false;
  export let errorMessage = '';
  export let min: number | undefined = undefined;
  export let max: number | undefined = undefined;
  export let step: number | undefined = undefined;
  export let pattern: string | undefined = undefined;
  export let customClass = '';
  export let helpText = '';
  export let id = '';
  
  export let onChange: ((data: { value: string | number; isValid: boolean }) => void) | undefined = undefined;
  
  let inputElement: HTMLInputElement;
  let isValid = true;
  let isTouched = false;
  let internalValue = String(value);
  let inputId = id || `input-${Math.random().toString(36).substring(2, 11)}`;
  
  $: {
    internalValue = String(value);
  }
  
  let inputAttributes: Record<string, string | number | undefined> = {};
  
  function validateInput() {
    switch (type) {
      case 'email':
        isValid = ValidationUtils.isValidEmail(internalValue) || !required && !internalValue;
        break;
      case 'tel':
        isValid = ValidationUtils.isValidPhone(internalValue) || !required && !internalValue;
        if (isValid && internalValue) {
          internalValue = ValidationUtils.formatPhone(internalValue);
        }
        break;
      case 'siret':
        isValid = ValidationUtils.isValidSiret(internalValue) || !required && !internalValue;
        if (isValid && internalValue) {
          internalValue = ValidationUtils.formatSiret(internalValue);
        }
        break;
      case 'vat':
        isValid = ValidationUtils.isValidVatNumber(internalValue) || !required && !internalValue;
        if (isValid && internalValue) {
          internalValue = ValidationUtils.formatVatNumber(internalValue);
        }
        break;
      case 'number':
        if (internalValue) {
          const num = Number.parseFloat(internalValue);
          if (Number.isNaN(num)) {
            isValid = false;
          } else {
            if (min !== undefined && num < min) isValid = false;
            else if (max !== undefined && num > max) isValid = false;
            else isValid = true;
          }
        } else {
          isValid = !required;
        }
        break;
      default:
        isValid = !required || !!internalValue;
        break;
    }
    
    let newValue: string | number = internalValue;
    if (type === 'number' && internalValue) {
      const parsedValue = Number.parseFloat(internalValue);
      if (!Number.isNaN(parsedValue)) {
        newValue = parsedValue;
      }
    }
    
    if (onChange) {
      onChange({ value: newValue, isValid });
    }
    
    if (typeof value === 'number' && type === 'number') {
      const parsedValue = Number.parseFloat(internalValue);
      value = Number.isNaN(parsedValue) ? 0 : parsedValue;
    } else {
      value = internalValue;
    }
  }
  
  $: {
    const htmlType = type === 'siret' || type === 'vat' ? 'text' : type;
    
    inputAttributes = {
      type: htmlType,
      placeholder,
      min,
      max,
      step,
      pattern
    };
    
    for (const key of Object.keys(inputAttributes)) {
      if (inputAttributes[key] === undefined) {
        delete inputAttributes[key];
      }
    }
  }
  
  function handleInput(event: Event) {
    internalValue = (event.target as HTMLInputElement).value;
    validateInput();
  }
  
  function handleBlur() {
    isTouched = true;
    validateInput();
  }
  
  onMount(() => {
    if (inputElement) {
      if (type === 'siret') {
        ValidationUtils.applyInputMask(
          inputElement,
          ValidationUtils.isValidSiret,
          ValidationUtils.formatSiret
        );
      } else if (type === 'tel') {
        ValidationUtils.applyInputMask(
          inputElement,
          ValidationUtils.isValidPhone,
          ValidationUtils.formatPhone
        );
      } else if (type === 'vat') {
        ValidationUtils.applyInputMask(
          inputElement,
          ValidationUtils.isValidVatNumber,
          ValidationUtils.formatVatNumber
        );
      }
    }
  });
  
  function getDefaultErrorMessage(): string {
    switch (type) {
      case 'email':
        return 'Veuillez entrer une adresse email valide';
      case 'tel':
        return 'Veuillez entrer un numéro de téléphone valide';
      case 'siret':
        return 'Le SIRET doit contenir 14 chiffres';
      case 'vat':
        return 'Numéro de TVA invalide (format: FR XXXXXXXXXXX)';
      case 'number': {
        let message = 'Veuillez entrer un nombre valide';
        if (min !== undefined && max !== undefined) {
          message += ` entre ${min} et ${max}`;
        } else if (min !== undefined) {
          message += ` supérieur ou égal à ${min}`;
        } else if (max !== undefined) {
          message += ` inférieur ou égal à ${max}`;
        }
        return message;
      }
      default:
        return 'Ce champ est requis';
    }
  }
</script>

<div class="mb-4">
  {#if label}
    <label for={inputId} class="block text-gray-700 mb-2">
      {label} {required ? '*' : ''}
    </label>
  {/if}
  
  <input
    bind:this={inputElement}
    bind:value={internalValue}
    id={inputId}
    on:input={handleInput}
    on:blur={handleBlur}
    class="w-full p-2 border rounded-lg {customClass} {!isValid && isTouched ? 'border-red-500' : ''}"
    {...inputAttributes}
  />
  
  {#if helpText}
    <div class="text-xs text-gray-600 mt-1">
      {helpText}
    </div>
  {/if}
  
  {#if !isValid && isTouched}
    <div class="text-red-500 text-xs mt-1">
      {errorMessage || getDefaultErrorMessage()}
    </div>
  {/if}
</div> 