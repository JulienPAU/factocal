# Factures App

Application de gestion de factures et devis pour freelances et petites entreprises.

## Fonctionnalités

- Création et gestion de factures et devis
- Conversion de devis en factures
- Numérotation automatique des documents
- Gestion des remises et taxes
- Export PDF et JSON
- Import JSON pour la sauvegarde/restauration
- Personnalisation avec logo
- Interface responsive
- Stockage local (localStorage)

## Installation

```bash
# Installation des dépendances
pnpm install

# Démarrage du serveur de développement
pnpm dev

# Construction pour la production
pnpm run build



## Utilisation

### Création de documents

Utilisez le formulaire de création pour générer vos factures et devis. Remplissez les informations du client, du prestataire et ajoutez les articles avec leurs prix.

### Conversion de devis en factures

Depuis la vue détaillée d'un devis, cliquez sur le bouton "Convertir en facture". Le système générera automatiquement une facture avec un numéro séquentiel et conservera la référence au devis d'origine.

### Export et Import

- **Export PDF**: Générez un PDF professionnel de votre facture ou devis
- **Export JSON**: Sauvegardez vos données pour les transférer ou les sauvegarder
- **Import JSON**: Restaurez vos données depuis une sauvegarde

## Personnalisation

Ajoutez votre logo depuis la page des paramètres. Le logo sera automatiquement intégré à vos documents avec un format optimisé.

## Architecture technique

Cette application est basée sur SvelteKit et utilise le localStorage pour la persistance des données. Aucune donnée n'est envoyée à un serveur externe.

## Notes importantes

- Vos données sont stockées uniquement dans votre navigateur
- Exportez régulièrement vos données pour éviter toute perte
- Pour changer d'appareil, utilisez les fonctions d'export/import
```
