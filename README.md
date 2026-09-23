# Salon de la Danse d'Angers 2027 • Plateforme de Gestion des Bénévoles

Plateforme web sur-mesure conçue pour le recrutement, l'affectation dynamique de créneaux et le contrôle d'accès des 130 bénévoles du **Salon de la Danse d'Angers** (14, 15 et 16 mai 2027 • Centre de Congrès / Parc des Expositions).

---

## 1. Stack Technique & Déploiement

- **Framework Fullstack** : [Nuxt 4](https://nuxt.com/) (Vue 3, Composition API, SSR/Nitro)
- **Moteur Backend & API** : Nitro Server Engine avec routes d'API typées TypeScript
- **Base de Données & ORM** : PostgreSQL & [Prisma ORM](https://www.prisma.io/) (Transactions atomiques & verrous pessimistes SQL)
- **Design & Composants** : [Nuxt UI](https://ui.nuxt.com/) & [Tailwind CSS v4](https://tailwindcss.com/)
- **Sécurité** : Authentification stateless JWT HTTP-Only, hachage `bcryptjs`, schémas de validation [Zod](https://zod.dev/)
- **Accréditations & Exports** : QR Codes dynamiques vectoriels (`qrcode`), génération de classeurs Excel stylisés (`exceljs`), impression A4 matricielle (`@media print`)
- **Déploiement & CI/CD** : Déploiement continu via **GitHub Actions** vers serveur VPS sous **PM2** et reverse-proxy Nginx avec certificat SSL Let's Encrypt.
- **Application en ligne** : `https://salondanse.mattisbbn.fr` *(ou selon domaine configuré sur le VPS)*

---

## 2. Parcours Bénévole

### 2.1. Inscription verrouillée par code & Détection de majorité
- Accès au formulaire strictement conditionné par un **code d'invitation unique** (`SD2027-XXXXXX`).
- Vérification automatique de l'âge selon la date de naissance :
  - **Majeurs** : Inscription standard avec photo d'identité obligatoire pour l'accréditation.
  - **Mineurs (< 18 ans)** : Basculement automatique en mode mineur exigeant l'upload d'une **autorisation parentale signée (PDF)** avant soumission.

![Inscription Bénévole et cas mineur](docs/screenshots/register-minor.png)

### 2.2. Moteur de planning interactif (Mobile First)
- **Contrôles algorithmiques stricts** :
  - **Quota horaire** : Entre 1 créneau minimum (2h) et 3 créneaux maximum (6h sur le week-end).
  - **Non-chevauchement** : Impossibilité de réserver deux missions sur la même tranche horaire.
  - **Pause obligatoire** : Interdiction absolue d'enchaîner 3 créneaux consécutifs le même jour (pause de 2h imposée).
  - **Postes sous restriction** : Billetterie et Caisse masquées du planning public et réservées à l'attribution manuelle admin.
- **Jauges dynamiques temps réel & Code couleur** :
  - **Vert** : Plus d'une place disponible.
  - **Orange** : 1 dernière place disponible (presque complet).
  - **Gris / Rouge** : Créneau complet (réservation bloquée).
- **Verrouillage concurrentiel pessimiste** : Réservation protégée par `SELECT ... FOR UPDATE` évitant tout surbooking en cas de clics simultanés.
- **Workflow de validation** : Mode brouillon persistant jusqu'au clic sur *« Confirmer et verrouiller »* avec modale de confirmation.

![Grille de sélection du planning](docs/screenshots/planning-selection.png)

### 2.3. Dashboard personnel & Badge numérique 3D
- Carte d'accréditation officielle avec **effet 3D tilt interactif** (perspective inertielle et reflet spéculaire).
- Affichage du statut dynamique :
  - Si le planning est validé : **Badge officiel actif** avec QR Code haute résolution.
  - Si le planning est en cours : Carte d'avertissement ambrée **« En attente de validation »**.
- **Modale QR Code plein écran** : Présentation optimisée pour le scan rapide aux portiques d'entrée du Salon.
- **Export & Impression PDF** : Fiche récapitulative A4 individuelle prête à imprimer avec consignes d'arrivée et contacts d'urgence.

![Badge Bénévole 3D et QR Code](docs/screenshots/volunteer-badge.png)

---

## 3. Espace Administrateur

### 3.1. Tableau de bord & Supervisions en temps réel
- Indicateurs clés (KPI) : Total bénévoles inscrits, plannings validés vs brouillons, invitations consommées, taux de remplissage global.
- Suivi du remplissage par jour (Ven. 14, Sam. 15, Dim. 16 mai) et ventilation par mission.
- Contrôle temporel des inscriptions : Ouverture et fermeture manuelle de la campagne d'un simple clic.

![Tableau de bord Admin](docs/screenshots/admin-dashboard.png)

### 3.2. Gestion des bénévoles & Outrepassement
- **Recherche multi-critères** : Filtrage combiné par texte (nom, prénom, e-mail, téléphone), statut (Tous, Validés, Brouillons), **Mission** et **Jour**.
- **Outrepassement des plannings** : Attribution forcée de postes sensibles (Caisse, Billetterie) ou créneaux complets, même sur un profil verrouillé.
- **Gestion des accès** : Réinitialisation du mot de passe avec génération de mot de passe temporaire ou envoi d'un lien sécurisé par e-mail.
- **Système de relance de convocation** :
  - Envoi individuel d'un e-mail de rappel de convocation.
  - Envoi groupé à tous les bénévoles validés via modale de confirmation.

![Filtres et gestion des bénévoles](docs/screenshots/admin-volunteers.png)

### 3.3. Validation des profils mineurs
- Espace dédié listant tous les candidats mineurs avec état de vérification : `PENDING`, `VALIDATED`, `REJECTED`.
- Visionneuse intégrée pour inspecter le document PDF d'autorisation parentale téléversé.
- Boutons d'action un-clic *« Valider »* ou *« Refuser »* avec répercussion instantanée sur le droit de participation.

![Validation des autorisations parentales](docs/screenshots/admin-minors.png)

### 3.4. Gestion des Missions & Flexibilité Multi-Éditions
- **CRUD Missions** : Création, modification des capacités maximales par défaut, couleur et indicateur sensible.
- **Gestion des jours à la volée** : Ajout ou suppression de journées d'événement avec génération automatique des tranches horaires (8h30-10h, 10h-12h, 12h-14h, 14h-16h, 16h-18h).
- **Archivage & Édition courante** : Définition de l'édition active et consultation cloisonnée des éditions passées.

![Configuration des jours et missions](docs/screenshots/admin-editions.png)

### 3.5. Centre d'exports de données multi-formats
- Téléchargement au format **Excel (.xlsx stylisé)** et **CSV (UTF-8 avec BOM)** :
  1. **Plannings généraux & Bénévoles** : Identités, coordonnées, heures et créneaux.
  2. **Feuilles d'émargement par Mission** : Listes nominatives par tranche horaire et poste (avec filtres mission/jour).
  3. **Fiches Contacts & Urgence** : Répertoire téléphonique, e-mails et statuts d'accord parental pour la régie.
- **Planche de Badges mass-print** : Page d'impression en grille A4 prête au découpage avec QR Codes de vérification.

![Centre d'exports de données](docs/screenshots/admin-exports.png)

### 3.6. Traçabilité & Journal d'Audit (`AuditLog`)
- Enregistrement immuable et horodaté de toutes les actions administratives (affectation forcée, suppression de créneau, validation de mineur, réinitialisation de mot de passe, relances).

---

## 4. Identifiants de Démonstration (Seed)

Tous les comptes ci-dessous sont générés automatiquement par la commande `pnpm exec prisma db seed`.

| Rôle / Profil | Prénom & Nom | E-mail de connexion | Mot de passe | État initial |
| :--- | :--- | :--- | :--- | :--- |
| **Administrateur** | Admin JayDance | `admin@salondeladanse.fr` | `Password123!` | Accès complet au back-office |
| **Bénévole Majeur** | Camille Moreau | `benevole@salondeladanse.fr` | `Password123!` | Majeur, planning vierge en brouillon (`DRAFT`) |
| **Bénévole Mineur (En attente)** | Léo Petit | `mineur.attente@salondeladanse.fr` | `Password123!` | 16 ans, PDF téléversé, statut `PENDING` |
| **Bénévole Mineur (Validé)** | Manon Dubois | `mineur.valide@salondeladanse.fr` | `Password123!` | 17 ans, autorisation approuvée (`VALIDATED`) |
| **Bénévole Mineur (Refusé)** | Lucas Roux | `mineur.refuse@salondeladanse.fr` | `Password123!` | 16 ans, autorisation rejetée (`REJECTED`) |

### Codes d'invitation de test (pour tester `/espace-benevole/register`) :
- **Code disponible vierge** : `SD2027-NOUVEAU` (création d'un nouveau compte bénévole).
- **Code avec e-mail pré-assigné** : `SD2027-ACTIF` (`invitation.active@test.fr`).
- **Codes génériques supplémentaires** : `SD2027-DEMO-1`, `SD2027-DEMO-2`.

---

## 5. Installation, Déploiement & Maintenance

### 5.1. Installation locale

```bash
# 1. Cloner le dépôt et installer les dépendances
git clone https://github.com/votre-orga/salondeladanse.git
cd salondeladanse
pnpm install

# 2. Configurer les variables d'environnement (.env)
cp .env.example .env
# Renseigner DATABASE_URL et JWT_SECRET

# 3. Synchroniser le schéma Prisma et exécuter le seeder
pnpm exec prisma db push --force-reset
pnpm exec prisma db seed

# 4. Démarrer le serveur de développement local
pnpm dev
# Application accessible sur http://localhost:3000
```

### 5.2. Commandes de maintenance & qualité

```bash
# Linter le code
pnpm lint

# Vérification du typage TypeScript
pnpm typecheck

# Régénérer le client Prisma après modification du schéma
pnpm exec prisma generate
```

### 5.3. Pipeline CI/CD Production (GitHub Actions & VPS)

Le déploiement est entièrement automatisé via le workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) :
1. Chaque push sur la branche `main` déclenche le runner GitHub Actions.
2. Connexion SSH sécurisée au serveur VPS de production.
3. Récupération du code (`git pull origin main`).
4. Installation des dépendances (`pnpm install --frozen-lockfile`).
5. Migration de la base de données PostgreSQL (`pnpm exec prisma db push`).
6. Compilation de l'application Nuxt 4 (`pnpm build`).
7. Rechargement à chaud avec zéro interruption de service sous PM2 (`pm2 restart ecosystem.config.cjs --update-env`).
