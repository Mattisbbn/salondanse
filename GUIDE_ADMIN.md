# Guide Administrateur · Gestion & Pilotage

Console d'administration et de supervision du **Salon de la Danse**  
Accès à l'application : [https://salondeladanse.mattisbabin.fr/admin](https://salondeladanse.mattisbabin.fr/admin)

---

## 1. Vue d'ensemble

Le portail d'administration du **Salon de la Danse** permet aux coordinateurs et à l'équipe organisatrice de piloter l'intégralité du dispositif bénévole :

- Recrutement et émission de codes d'invitation sécurisés.
- Suivi du remplissage des créneaux et des inscriptions en temps réel.
- Régulation et arbitrage des plannings (affectations manuelles, missions sensibles, gestion des désistements).
- Contrôle de conformité légale des bénévoles mineurs (vérification des autorisations parentales).
- Définition du catalogue des missions et de la matrice des créneaux horaires.
- Génération et impression en masse des badges physiques avec QR codes.
- Extraction des feuilles d'émargement terrain et du prévisionnel catering (repas).
- Traçabilité des interventions administratives via un journal d'audit immuable.
- Gestion multi-éditions du festival.

### Prérequis d'accès
- Disposer d'un compte utilisateur gratifié du rôle `ADMIN`.
- Accès direct via l'URL [https://salondeladanse.mattisbabin.fr/espace-benevole/login](https://salondeladanse.mattisbabin.fr/espace-benevole/login) (redirection automatique vers `/admin` pour les administrateurs) ou directement via le menu d'administration.

---

## 2. Tableau de Bord et Pilotage de Campagne

Le tableau de bord administrateur offre une vue synthétique et dynamique de l'état d'avancement des inscriptions et du remplissage des postes.

![Tableau de bord administrateur et métriques globales](./screenshots/admin-01-dashboard.png)

### Indicateurs de pilotage :
1. **Compteurs globaux** :
   - **Bénévoles inscrits** : Nombre total de comptes créés.
   - **Plannings validés** : Nombre de bénévoles ayant confirmé et verrouillé leurs créneaux.
   - **Plannings en brouillon** : Candidatures commencées mais non finalisées (à relancer).
   - **Invitations** : Nombre de codes générés, utilisés et disponibles.
   - **Taux de remplissage global** : Pourcentage de postes pourvus par rapport à la capacité maximale cumulée de l'édition.
2. **Interrupteur d'ouverture des inscriptions** :
   - Situé en haut à droite du tableau de bord.
   - Permet d'ouvrir ou de clôturer instantanément l'accès aux choix de créneaux pour les bénévoles.
   - Toute modification déclenche une modale de confirmation et est consignée dans le journal d'audit.
3. **Baromètres de couverture par jour et par mission** :
   - Visualisation graphique des jours critiques ou sous-effectifs.
   - Identification immédiate des missions en tension (taux de remplissage faible).

---

## 3. Gestion des Invitations et Recrutement

Pour garantir la qualité et la sécurité du festival, l'accès à la plateforme est restreint par un système de codes d'invitation à usage unique.

![Interface de gestion et d'émission des invitations](./screenshots/admin-02-invitations.png)

### Émettre une invitation :
1. Accédez au menu **« Invitations »** ([/admin/invitations](https://salondeladanse.mattisbabin.fr/admin/invitations)).
2. Saisissez l'adresse email du futur bénévole dans le champ prévu.
3. Cliquez sur **« Envoyer l'invitation »**.
4. Le système génère automatiquement un jeton unique (code alphanumérique à 8 caractères) et transmet un email personnalisé au destinataire contenant un lien d'inscription direct.

### Suivi et actions sur les invitations :
- **Tableau des invitations** : Permet de visualiser pour chaque code : la date de création, l'adresse cible, le statut (*Non utilisé* ou *Utilisé*), ainsi que l'identité du compte qui l'a consommé.
- **Régénération / Renvoi** : En cas de perte du courriel par un candidat ou d'erreur d'adresse, saisissez de nouveau l'email : une modale propose de révoquer l'ancien code et d'en émettre un nouveau immédiatement.
- **Copie rapide de lien** : Cliquez sur l'icône de copie pour récupérer le lien direct (`/espace-benevole/register?code=...`) afin de le transmettre par messagerie instantanée si nécessaire.

---

## 4. Annuaire des Bénévoles & Gestion des Plannings

Ce module centralise la gestion unitaire des bénévoles, le suivi de leurs engagements et les arbitrages manuels sur leurs plannings.

![Annuaire des bénévoles et filtres avancés](./screenshots/admin-03-gestion-benevoles.png)

### Filtrage et recherche :
- **Barre de recherche** : Filtrage en temps réel par nom, prénom ou adresse email.
- **Filtre par statut** : *Tous*, *Plannings validés*, *Plannings en brouillon*.
- **Filtres par mission et par jour** : Pour isoler instantanément les bénévoles affectés à un poste ou une journée précise.

### Campagnes de relance par email :
- **Relance groupée** : Le bouton **« Relancer les brouillons »** ouvre une boîte de confirmation récapitulant le nombre de bénévoles concernés. Un email de rappel d'urgence leur est envoyé automatiquement.
- **Relance individuelle** : Une icône d'enveloppe sur chaque ligne permet de relancer un bénévole précis sans solliciter les autres.

![Fiche de gestion détaillée d'un bénévole et affectation manuelle](./screenshots/admin-04-fiche-benevole-affectations.png)

### Édition d'un bénévole et affectations manuelles :
1. Cliquez sur le nom d'un bénévole ou sur **« Voir / Modifier »** pour ouvrir le volet latéral complet.
2. **Coordonnées** : Modifiez si besoin les informations civiles (nom, prénom, téléphone, email).
3. **Verrouillage du statut** : Forcez manuellement le statut en *Brouillon* ou *Validé* (utile en cas de demande de modification formulée par téléphone).
4. **Affectation de missions sensibles** :
   - Les missions sensibles (sécurité, régie, encadrement) ne sont pas ouvertes au grand public.
   - Depuis ce volet, sélectionnez un créneau horaire puis la mission sensible souhaitée.
   - Cliquez sur **« Assigner »** : le créneau est instantanément intégré au planning du bénévole, même si le quota public était bloqué.
5. **Désaffectation** : Cliquez sur la croix rouge d'un créneau assigné pour libérer la place immédiatement.

---

## 5. Validation et Conformité des Bénévoles Mineurs

Conformément à la législation en vigueur sur le travail bénévole des mineurs, tout jeune âgé de moins de 18 ans doit impérativement fournir une autorisation parentale valide.

![Interface de validation des autorisations parentales pour mineurs](./screenshots/admin-05-validation-mineurs.png)

### Circuit d'approbation d'un mineur :
1. Accédez à la section **« Mineurs »** ([/admin/minors](https://salondeladanse.mattisbabin.fr/admin/minors)).
2. L'écran liste tous les bénévoles mineurs avec leur âge exact calculé à la date de l'événement et leur statut réglementaire :
   - `PENDING` (En attente d'examen).
   - `VALIDATED` (Conforme et validé).
   - `REJECTED` (Document non recevable ou manquant).
3. Cliquez sur **« Voir le document »** pour ouvrir le visualiseur intégré du fichier déposé par le bénévole (PDF ou scan d'image).
4. Vérifiez la présence de l'identité du responsable légal, de la signature manuscrite et de la mention manuscrite requise.
5. Choisissez l'action appropriée :
   - **Valider le profil** : L'autorisation est enregistrée comme conforme, et le badge du bénévole est débloqué.
   - **Refuser le profil** : Le bénévole est notifié pour soumettre un document corrigé.

---

## 6. Configuration des Missions & Matrice des Créneaux

Ce module en deux étapes permet de concevoir l'architecture opérationnelle du festival avant l'ouverture des inscriptions.

![Catalogue des missions et configuration des attributs](./screenshots/admin-06-catalogue-missions.png)

### Étape 1 : Le Catalogue des Missions
1. Accédez à **« Missions »** ([/admin/missions](https://salondeladanse.mattisbabin.fr/admin/missions)).
2. Cliquez sur **« Nouvelle mission »** pour enrichir le référentiel :
   - **Intitulé** : Nom explicite (ex: *Contrôle Billetterie Entrée*, *Accueil Artistes & VIP*, *Régie Scène Principale*).
   - **Couleur thématique** : Code couleur facilitant l'identification sur les plannings graphiques.
   - **Description du poste** : Consignes et missions confiées aux bénévoles.
   - **Capacité par défaut** : Nombre standard de bénévoles requis.
   - **Option « Mission sensible »** : Cochez cette case pour réserver la mission à l'affectation manuelle par les coordinateurs (masquée du formulaire d'auto-sélection bénévole).

![Matrice de planification et créneaux horaires par jour](./screenshots/admin-07-matrice-planning-creneaux.png)

### Étape 2 : La Matrice Calendaire (Grille horaire)
1. Basculez sur l'onglet **« Matrice & Créneaux »**.
2. Sélectionnez le jour d'exploitation (Vendredi, Samedi, Dimanche).
3. **Création d'une plage horaire (TimeSlot)** : Définissez l'heure de début et l'heure de fin (ex: 08h30 - 12h30).
4. **Association de missions** :
   - Ajoutez les missions requises sur cette tranche horaire.
   - Ajustez la capacité maximale requise pour ce créneau spécifique.
   - Renseignez les **Notes de localisation & consignes terrain** (ex: *Présentez-vous 15 min avant au Desk central*, *Tenue noire demandée*).

---

## 7. Édition & Impression en Masse des Badges

À l'approche du festival, le module Badges permet de fabriquer les badges physiques prêts pour distribution ou plastification.

![Module d'impression groupée des badges d'accès](./screenshots/admin-08-impression-badges.png)

### Procédure d'impression :
1. Rendez-vous sur la page **« Badges »** ([/admin/badges](https://salondeladanse.mattisbabin.fr/admin/badges)).
2. Filtrez si nécessaire par nom, prénom ou jour de présence.
3. Cliquez sur **« Imprimer la planche de badges »**.
4. La feuille de style d'impression calibre automatiquement 4 badges par page A4 au format vertical standard, avec repères de découpe, QR codes d'authentification haute résolution et photos des bénévoles.

---

## 8. Rapports, Feuilles d'Émargement & Exports

Toutes les données de la plateforme sont exportables sous formats universels (Excel `.xlsx` et `.csv`) pour une utilisation terrain sans connexion internet.

![Centre de téléchargement des exports et reporting](./screenshots/admin-09-exports-reporting.png)

### Les types d'extractions disponibles :
1. **Feuilles d'émargement terrain (par jour / créneau)** :
   - Liste des bénévoles convoqués avec case à signer, téléphone portable et consignes de poste.
   - Indispensable pour les responsables de zones et chefs d'équipe à chaque début de tranche horaire.
2. **Annuaire général des bénévoles** :
   - Fichier complet recensant l'état civil, les téléphones, emails, statut d'approbation mineur et cumul d'heures.
3. **Bilan logistique Catering (Prévisionnel repas)** :
   - Décompte exact des déjeuners et dîners nécessaires jour par jour pour la commande auprès du traiteur du festival.

---

## 9. Journal d'Audit et Sécurité (Logs)

Afin de prévenir les erreurs de manipulation et d'assurer une traçabilité rigoureuse, toute action modifiant l'état de l'application est enregistrée de manière immuable.

![Journal d'audit de sécurité et historique des actions](./screenshots/admin-10-audit-logs.png)

### Consultation des journaux :
1. Rendez-vous sur **« Logs »** ([/admin/logs](https://salondeladanse.mattisbabin.fr/admin/logs)).
2. Utilisez le filtre par type d'action :
   - `ASSIGN_MISSION` / `UNASSIGN_MISSION` : Affectations manuelles de postes.
   - `APPROVE_MINOR` / `REJECT_MINOR` : Décisions sur les autorisations parentales.
   - `LOCK_STATUS` : Modifications forcées de plannings.
   - `SEND_INVITATION` : Émissions de codes.
   - `CREATE_EDITION` : Configuration de nouvelles saisons.
3. Chaque ligne consigne l'horodatage précis à la seconde, l'email de l'administrateur responsable, l'identifiant de la cible et les détails de l'opération.

---

## 10. Gestion Multi-Éditions & Clôture de Saison

L'application prend en charge le fonctionnement multi-éditions, assurant la pérennité des données d'une année sur l'autre sans risque de collision.

![Interface de gestion et bascule des éditions annuelles](./screenshots/admin-11-gestion-editions.png)

### Gérer les éditions :
1. Accédez à **« Éditions »** ([/admin/editions](https://salondeladanse.mattisbabin.fr/admin/editions)).
2. **Créer une nouvelle édition** :
   - Cliquez sur **« Nouvelle édition »**.
   - Indiquez le millésime (ex: `2028`), le libellé officiel et les dates du festival.
3. **Basculer l'édition active** :
   - L'édition marquée `Active` détermine l'espace accessible au public et aux bénévoles.
   - Pour archiver une édition et passer à la suivante, cliquez sur **« Définir comme édition active »**.
   - Les données des années précédentes demeurent consultables en lecture et exportables à tout moment.
