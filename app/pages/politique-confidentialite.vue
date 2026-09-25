<script setup lang="ts">
const { isAuthenticated, isBenevole, isAdmin } = useAuth()

useHead({
  title: 'Politique de Confidentialité (RGPD)',
  meta: [
    {
      name: 'description',
      content: 'Politique de confidentialité et protection des données personnelles (RGPD) du Salon de la Danse d\'Angers 2027.'
    }
  ]
})

// Détermination du lien de retour contextuel
const backRoute = computed(() => {
  if (isAdmin.value) return '/admin'
  if (isBenevole.value) return '/espace-benevole/dashboard'
  return '/'
})

const backLabel = computed(() => {
  if (isAdmin.value) return 'Tableau de bord admin'
  if (isBenevole.value) return 'Mon espace bénévole'
  return 'Retour à l\'accueil'
})

const copiedEmail = ref(false)
const copyEmail = async () => {
  try {
    await navigator.clipboard.writeText('contact@salondeladanse.fr')
    copiedEmail.value = true
    setTimeout(() => {
      copiedEmail.value = false
    }, 2500)
  } catch {
    // Fallback silencieux
  }
}

const printPolicy = () => {
  if (typeof window !== 'undefined') {
    window.print()
  }
}
</script>

<template>
  <div class="space-y-8 max-w-5xl mx-auto pb-12">
    <!-- ======================================================== -->
    <!-- EN-TÊTE / HERO DE LA PAGE                                -->
    <!-- ======================================================== -->
    <header class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
      <!-- Accent décoratif subtil aux couleurs du Salon -->
      <div class="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#F3DCD5]/40 blur-3xl pointer-events-none" />
      <div class="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#F7E4C6]/40 blur-2xl pointer-events-none" />

      <div class="relative z-10 space-y-4">
        <!-- Navigation haute / bouton retour -->
        <div class="flex flex-wrap items-center justify-between gap-3 no-print">
          <NuxtLink
            :to="backRoute"
            class="inline-flex items-center gap-2 text-xs font-semibold text-[#7A291E] hover:text-[#5E1F16] transition-colors py-1.5 px-3 rounded-full bg-[#FAF2EF] border border-[#ECCBC4]"
          >
            <UIcon name="i-lucide-arrow-left" class="w-3.5 h-3.5" />
            <span>{{ backLabel }}</span>
          </NuxtLink>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-[#6E5A52] hover:text-[#2A1512] py-1.5 px-3 rounded-full border border-[#E6D9CB] hover:bg-[#FAF2EF] transition-colors cursor-pointer"
              title="Imprimer cette politique"
              @click="printPolicy"
            >
              <UIcon name="i-lucide-printer" class="w-3.5 h-3.5 text-[#7A291E]" />
              <span>Imprimer</span>
            </button>
          </div>
        </div>

        <div class="pt-2">
          <span class="da-kicker block mb-1.5">Conformité RGPD & Protection de la vie privée</span>
          <h1 class="da-title text-2xl sm:text-3xl lg:text-4xl text-[#2A1512] tracking-tight">
            Politique de Confidentialité
          </h1>
          <p class="text-sm sm:text-base text-[#6E5A52] font-normal mt-2 max-w-3xl leading-relaxed">
            Dans le cadre de l'organisation du <strong class="text-[#2A1512] font-semibold">Salon de la Danse d'Angers 2027</strong>,
            notre association s'engage à assurer la protection, la confidentialité et la sécurité des données
            à caractère personnel de tous ses bénévoles et intervenants, dans le respect strict du Règlement Général sur la Protection des Données (RGPD - Règlement UE 2016/679).
          </p>
        </div>

        <!-- Badges d'information clé -->
        <div class="pt-2 flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-[#6E5A52]">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4F2] border border-[#ECCBC4] font-medium text-[#7A291E]">
            <UIcon name="i-lucide-shield-check" class="w-3.5 h-3.5" />
            <span>Conforme RGPD & Loi Informatique et Libertés</span>
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFE6DA] border border-[#D8C6B4] font-medium text-[#2A1512]">
            <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5 text-[#7A291E]" />
            <span>Édition 14, 15 & 16 mai 2027</span>
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4F2] border border-[#E6D9CB] font-medium">
            <UIcon name="i-lucide-clock" class="w-3.5 h-3.5 text-[#D9B777]" />
            <span>Dernière révision : 24 septembre 2026</span>
          </span>
        </div>
      </div>
    </header>

    <!-- ======================================================== -->
    <!-- SOMMAIRE RAPIDE / ACCÈS PAR SECTIONS                    -->
    <!-- ======================================================== -->
    <nav class="bg-[#FAF4F2] border border-[#ECCBC4] rounded-2xl p-4 sm:p-5 no-print" aria-label="Sommaire de la politique">
      <div class="flex items-center gap-2 mb-3 text-xs font-bold uppercase tracking-wider text-[#7A291E]">
        <UIcon name="i-lucide-list" class="w-4 h-4" />
        <span>Sommaire thématique</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
        <a href="#responsable" class="p-2.5 rounded-xl bg-white border border-[#E6D9CB] hover:border-[#7A291E] hover:text-[#7A291E] transition-colors flex items-center gap-2 font-medium">
          <UIcon name="i-lucide-building-2" class="w-4 h-4 text-[#7A291E] shrink-0" />
          <span class="truncate">1. Responsable de traitement</span>
        </a>
        <a href="#donnees" class="p-2.5 rounded-xl bg-white border border-[#E6D9CB] hover:border-[#7A291E] hover:text-[#7A291E] transition-colors flex items-center gap-2 font-medium">
          <UIcon name="i-lucide-database" class="w-4 h-4 text-[#7A291E] shrink-0" />
          <span class="truncate">2. Données collectées & Finalités</span>
        </a>
        <a href="#bases-legales" class="p-2.5 rounded-xl bg-white border border-[#E6D9CB] hover:border-[#7A291E] hover:text-[#7A291E] transition-colors flex items-center gap-2 font-medium">
          <UIcon name="i-lucide-scale" class="w-4 h-4 text-[#7A291E] shrink-0" />
          <span class="truncate">3. Bases légales</span>
        </a>
        <a href="#conservation" class="p-2.5 rounded-xl bg-white border border-[#E6D9CB] hover:border-[#7A291E] hover:text-[#7A291E] transition-colors flex items-center gap-2 font-medium">
          <UIcon name="i-lucide-hourglass" class="w-4 h-4 text-[#7A291E] shrink-0" />
          <span class="truncate">4. Durées de conservation</span>
        </a>
        <a href="#securite" class="p-2.5 rounded-xl bg-white border border-[#E6D9CB] hover:border-[#7A291E] hover:text-[#7A291E] transition-colors flex items-center gap-2 font-medium">
          <UIcon name="i-lucide-lock" class="w-4 h-4 text-[#7A291E] shrink-0" />
          <span class="truncate">5. Destinataires & Sécurité</span>
        </a>
        <a href="#droits" class="p-2.5 rounded-xl bg-white border border-[#E6D9CB] hover:border-[#7A291E] hover:text-[#7A291E] transition-colors flex items-center gap-2 font-medium">
          <UIcon name="i-lucide-user-check" class="w-4 h-4 text-[#7A291E] shrink-0" />
          <span class="truncate">6. Vos droits & Contact</span>
        </a>
      </div>
    </nav>

    <!-- ======================================================== -->
    <!-- 1. RESPONSABLE DE TRAITEMENT                             -->
    <!-- ======================================================== -->
    <section id="responsable" class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 space-y-4">
      <div class="flex items-center gap-3 border-b border-[#E6D9CB] pb-4">
        <div class="w-10 h-10 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] flex items-center justify-center text-[#7A291E] shrink-0">
          <UIcon name="i-lucide-building-2" class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold tracking-wider uppercase text-[#7A291E]">Section 1</span>
          <h2 class="text-xl font-bold text-[#2A1512]">
            Responsable de Traitement
          </h2>
        </div>
      </div>

      <p class="text-sm text-[#6E5A52] leading-relaxed">
        Le traitement des données à caractère personnel collectées sur cette plateforme est sous la responsabilité de :
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div class="p-4 rounded-2xl bg-[#FAF4F2] border border-[#ECCBC4] space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-[#7A291E] uppercase tracking-wider">
            <UIcon name="i-lucide-map-pin" class="w-4 h-4" />
            <span>Organisation</span>
          </div>
          <p class="text-sm font-bold text-[#2A1512]">
            Association organisatrice du Salon de la Danse
          </p>
          <p class="text-xs text-[#6E5A52]">
            Siège social : Angers (Maine-et-Loire, 49000), France<br>
            Événement au Centre de Congrès & Parc des Expositions
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-[#FAF4F2] border border-[#ECCBC4] space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-[#7A291E] uppercase tracking-wider">
            <UIcon name="i-lucide-mail" class="w-4 h-4" />
            <span>Contact dédié vie privée</span>
          </div>
          <p class="text-xs text-[#6E5A52]">
            Pour toute question, exercice de vos droits ou échange avec le référent vie privée :
          </p>
          <div class="flex items-center gap-2 pt-1">
            <a
              href="mailto:contact@salondeladanse.fr"
              class="text-xs sm:text-sm font-bold text-[#7A291E] hover:underline"
            >
              contact@salondeladanse.fr
            </a>
            <button
              type="button"
              class="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-[#D8C6B4] hover:bg-[#FAF2EF] text-[#2A1512] transition-colors cursor-pointer"
              @click="copyEmail"
            >
              {{ copiedEmail ? 'Copié !' : 'Copier' }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 2. DONNÉES COLLECTÉES & FINALITÉS                        -->
    <!-- ======================================================== -->
    <section id="donnees" class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 space-y-6">
      <div class="flex items-center gap-3 border-b border-[#E6D9CB] pb-4">
        <div class="w-10 h-10 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] flex items-center justify-center text-[#7A291E] shrink-0">
          <UIcon name="i-lucide-database" class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold tracking-wider uppercase text-[#7A291E]">Section 2</span>
          <h2 class="text-xl font-bold text-[#2A1512]">
            Données Collectées & Finalités du Traitement
          </h2>
        </div>
      </div>

      <p class="text-sm text-[#6E5A52] leading-relaxed">
        Nous appliquons le principe de <strong class="text-[#2A1512]">minimisation des données</strong> : seules les informations strictement indispensables à la gestion bénévole et à la sécurité du Salon sont requises.
      </p>

      <!-- 2.1 Bénévoles majeurs -->
      <div class="border border-[#E6D9CB] rounded-2xl p-5 bg-[#FFFCF8] space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-[#7A291E] text-white flex items-center justify-center text-xs font-bold">A</span>
            <h3 class="text-base font-bold text-[#2A1512]">
              Bénévoles majeurs
            </h3>
          </div>
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF2EF] text-[#7A291E] border border-[#ECCBC4]">
            Parcours standard
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-[#E6D9CB] text-[#2A1512] font-semibold bg-[#FAF4F2]/50">
                <th class="py-2.5 px-3">Donnée collectée</th>
                <th class="py-2.5 px-3">Finalité opérationnelle</th>
                <th class="py-2.5 px-3 w-28">Caractère</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#E6D9CB]/60 text-[#6E5A52]">
              <tr>
                <td class="py-2.5 px-3 font-medium text-[#2A1512]">Nom & Prénom</td>
                <td class="py-2.5 px-3">Identification personnelle, feuille d'émargement, personnalisation du badge officiel.</td>
                <td class="py-2.5 px-3"><span class="font-semibold text-[#7A291E]">Obligatoire</span></td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-medium text-[#2A1512]">Adresse e-mail & Téléphone</td>
                <td class="py-2.5 px-3">Envoi du planning, alertes en temps réel, coordination d'équipe et joignabilité d'urgence pendant l'événement.</td>
                <td class="py-2.5 px-3"><span class="font-semibold text-[#7A291E]">Obligatoire</span></td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-medium text-[#2A1512]">Mot de passe (haché)</td>
                <td class="py-2.5 px-3">Accès sécurisé à l'Espace Bénévole. Stocké avec hachage cryptographique irréversible (bcrypt).</td>
                <td class="py-2.5 px-3"><span class="font-semibold text-[#7A291E]">Obligatoire</span></td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-medium text-[#2A1512]">Photo d'identité</td>
                <td class="py-2.5 px-3">Génération du badge nominatif individuel et vérification visuelle lors du contrôle d'accès aux portiques.</td>
                <td class="py-2.5 px-3"><span class="font-semibold text-[#7A291E]">Obligatoire</span></td>
              </tr>
              <tr>
                <td class="py-2.5 px-3 font-medium text-[#2A1512]">Disponibilités & Créneaux choisis</td>
                <td class="py-2.5 px-3">Constitution du planning de présence (1 à 3 créneaux de 2h), prévention des conflits horaires et respect des temps de pause.</td>
                <td class="py-2.5 px-3"><span class="font-semibold text-[#7A291E]">Obligatoire</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2.2 Bénévoles mineurs -->
      <div class="border border-[#D9A660] rounded-2xl p-5 bg-[#FDF9F3] space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-[#8A4B0F] text-white flex items-center justify-center text-xs font-bold">B</span>
            <h3 class="text-base font-bold text-[#2A1512]">
              Bénévoles mineurs (Spécificité 16–17 ans)
            </h3>
          </div>
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F7E4C6] text-[#8A4B0F] border border-[#D9A660]">
            Protection renforcée
          </span>
        </div>

        <p class="text-xs text-[#6E5A52]">
          L'accueil de bénévoles mineurs est subordonné à un protocole de conformité juridique stricte garantissant leur protection :
        </p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div class="p-3 bg-white rounded-xl border border-[#E6D9CB] space-y-1">
            <div class="flex items-center gap-1.5 text-xs font-bold text-[#8A4B0F]">
              <UIcon name="i-lucide-calendar-check" class="w-4 h-4" />
              <span>Date de naissance</span>
            </div>
            <p class="text-xs text-[#6E5A52]">
              Permet la détection automatique de la minorité lors de l'inscription et le déclenchement du circuit de contrôle spécifique.
            </p>
          </div>

          <div class="p-3 bg-white rounded-xl border border-[#E6D9CB] space-y-1">
            <div class="flex items-center gap-1.5 text-xs font-bold text-[#8A4B0F]">
              <UIcon name="i-lucide-file-text" class="w-4 h-4" />
              <span>Autorisation parentale (PDF)</span>
            </div>
            <p class="text-xs text-[#6E5A52]">
              Dépôt obligatoire d'un document signé attestant du consentement des représentants légaux avant validation définitive du profil.
            </p>
          </div>

          <div class="p-3 bg-white rounded-xl border border-[#E6D9CB] space-y-1">
            <div class="flex items-center gap-1.5 text-xs font-bold text-[#8A4B0F]">
              <UIcon name="i-lucide-phone-call" class="w-4 h-4" />
              <span>Contacts des tuteurs</span>
            </div>
            <p class="text-xs text-[#6E5A52]">
              Joignabilité prioritaire et immédiate des parents ou représentants légaux en cas d'urgence sur le site du Salon.
            </p>
          </div>
        </div>
      </div>

      <!-- 2.3 Administrateurs & Journalisation -->
      <div class="border border-[#E6D9CB] rounded-2xl p-5 bg-[#FFFCF8] space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-[#2E1411] text-white flex items-center justify-center text-xs font-bold">C</span>
            <h3 class="text-base font-bold text-[#2A1512]">
              Administrateurs & Journalisation des actions (Logs d'audit)
            </h3>
          </div>
          <span class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF4F2] text-[#2A1512] border border-[#D8C6B4]">
            Traçabilité & Sécurité
          </span>
        </div>

        <p class="text-xs text-[#6E5A52] leading-relaxed">
          Pour assurer l'intégrité de la plateforme et prévenir tout abus, chaque action effectuée par un compte administrateur fait l'objet d'un enregistrement horodaté infalsifiable :
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
          <div class="p-2.5 rounded-xl bg-[#FAF4F2] border border-[#E6D9CB]">
            <p class="font-bold text-[#7A291E]">Horodatage UTC</p>
            <p class="text-[#6E5A52] text-[11px] mt-0.5">Date et heure exactes de chaque opération.</p>
          </div>
          <div class="p-2.5 rounded-xl bg-[#FAF4F2] border border-[#E6D9CB]">
            <p class="font-bold text-[#7A291E]">Identifiant Admin</p>
            <p class="text-[#6E5A52] text-[11px] mt-0.5">Référence de l'organisateur à l'origine de l'action.</p>
          </div>
          <div class="p-2.5 rounded-xl bg-[#FAF4F2] border border-[#E6D9CB]">
            <p class="font-bold text-[#7A291E]">Type d'opération</p>
            <p class="text-[#6E5A52] text-[11px] mt-0.5">Validation de mineur, affectation, export, reset mot de passe.</p>
          </div>
          <div class="p-2.5 rounded-xl bg-[#FAF4F2] border border-[#E6D9CB]">
            <p class="font-bold text-[#7A291E]">Identifiant cible</p>
            <p class="text-[#6E5A52] text-[11px] mt-0.5">Entité ou bénévole concerné par l'opération.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 3. BASES LÉGALES DU TRAITEMENT                           -->
    <!-- ======================================================== -->
    <section id="bases-legales" class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 space-y-4">
      <div class="flex items-center gap-3 border-b border-[#E6D9CB] pb-4">
        <div class="w-10 h-10 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] flex items-center justify-center text-[#7A291E] shrink-0">
          <UIcon name="i-lucide-scale" class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold tracking-wider uppercase text-[#7A291E]">Section 3</span>
          <h2 class="text-xl font-bold text-[#2A1512]">
            Bases Légales du Traitement (Art. 6 RGPD)
          </h2>
        </div>
      </div>

      <p class="text-sm text-[#6E5A52] leading-relaxed">
        Chaque collecte de données s'appuie sur une base juridique licite et clairement définie :
      </p>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
        <div class="p-5 rounded-2xl bg-[#FAF4F2] border border-[#ECCBC4] flex flex-col justify-between space-y-3">
          <div class="space-y-2">
            <div class="w-8 h-8 rounded-xl bg-[#7A291E] text-white flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h3 class="text-sm font-bold text-[#2A1512]">
              Exécution de l'engagement bénévole
            </h3>
            <p class="text-xs text-[#6E5A52] leading-relaxed">
              Le traitement est nécessaire à la gestion de la candidature, à la réservation des créneaux de mission et à la remise du badge nominatif d'accès à l'événement.
            </p>
          </div>
          <span class="text-[10px] font-bold text-[#7A291E] uppercase tracking-wider">Art. 6.1.b du RGPD</span>
        </div>

        <div class="p-5 rounded-2xl bg-[#FAF4F2] border border-[#ECCBC4] flex flex-col justify-between space-y-3">
          <div class="space-y-2">
            <div class="w-8 h-8 rounded-xl bg-[#7A291E] text-white flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h3 class="text-sm font-bold text-[#2A1512]">
              Obligation légale & protection des mineurs
            </h3>
            <p class="text-xs text-[#6E5A52] leading-relaxed">
              Vérification formelle de la majorité, conformité aux règles d'encadrement des mineurs en milieu associatif et conservation réglementaire des journaux de sécurité.
            </p>
          </div>
          <span class="text-[10px] font-bold text-[#7A291E] uppercase tracking-wider">Art. 6.1.c du RGPD</span>
        </div>

        <div class="p-5 rounded-2xl bg-[#FAF4F2] border border-[#ECCBC4] flex flex-col justify-between space-y-3">
          <div class="space-y-2">
            <div class="w-8 h-8 rounded-xl bg-[#7A291E] text-white flex items-center justify-center text-sm font-bold">
              3
            </div>
            <h3 class="text-sm font-bold text-[#2A1512]">
              Intérêt légitime de l'organisation
            </h3>
            <p class="text-xs text-[#6E5A52] leading-relaxed">
              Sécurisation du site public (contrôle d'accès par QR Code unique aux portiques d'entrée), traçabilité des accès aux données et prévention de la fraude.
            </p>
          </div>
          <span class="text-[10px] font-bold text-[#7A291E] uppercase tracking-wider">Art. 6.1.f du RGPD</span>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 4. DURÉES DE CONSERVATION                                -->
    <!-- ======================================================== -->
    <section id="conservation" class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 space-y-4">
      <div class="flex items-center gap-3 border-b border-[#E6D9CB] pb-4">
        <div class="w-10 h-10 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] flex items-center justify-center text-[#7A291E] shrink-0">
          <UIcon name="i-lucide-hourglass" class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold tracking-wider uppercase text-[#7A291E]">Section 4</span>
          <h2 class="text-xl font-bold text-[#2A1512]">
            Durée de Conservation des Données
          </h2>
        </div>
      </div>

      <p class="text-sm text-[#6E5A52] leading-relaxed">
        Les données sont conservées pour une durée strictement proportionnée aux besoins de l'édition du Salon de la Danse :
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
        <div class="p-4 rounded-2xl bg-white border border-[#E6D9CB] space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-[#7A291E]">
            <UIcon name="i-lucide-user-check" class="w-4 h-4" />
            <span>Comptes bénévoles & Plannings</span>
          </div>
          <p class="text-xs font-semibold text-[#2A1512]">
            Durée de l'édition en cours + 6 mois maximum
          </p>
          <p class="text-xs text-[#6E5A52] leading-relaxed">
            Conservées jusqu'au bilan d'activité de l'édition. Les données sont ensuite purgées ou anonymisées à des fins statistiques. Une conservation limitée n'est possible qu'avec votre consentement préalable pour vous réinviter l'année suivante.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-[#E6D9CB] space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-[#7A291E]">
            <UIcon name="i-lucide-shield-alert" class="w-4 h-4" />
            <span>Autorisations parentales (PDF) & Photos</span>
          </div>
          <p class="text-xs font-semibold text-[#2A1512]">
            Supprimées à l'issue de l'événement
          </p>
          <p class="text-xs text-[#6E5A52] leading-relaxed">
            Les pièces justificatives (PDF d'autorisation parentale et photos d'identité des badges) sont détruites et purgées de nos serveurs dès la fin du festival et l'invalidation des accès.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-white border border-[#E6D9CB] space-y-2">
          <div class="flex items-center gap-2 text-xs font-bold text-[#7A291E]">
            <UIcon name="i-lucide-file-clock" class="w-4 h-4" />
            <span>Logs d'audit & Journaux de connexion</span>
          </div>
          <p class="text-xs font-semibold text-[#2A1512]">
            12 mois maximum (durée légale)
          </p>
          <p class="text-xs text-[#6E5A52] leading-relaxed">
            Les journaux techniques de traçabilité et de sécurité sont automatiquement purgés après un délai glissant de 12 mois, conformément aux exigences légales.
          </p>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 5. DESTINATAIRES ET SÉCURITÉ                             -->
    <!-- ======================================================== -->
    <section id="securite" class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 space-y-5">
      <div class="flex items-center gap-3 border-b border-[#E6D9CB] pb-4">
        <div class="w-10 h-10 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] flex items-center justify-center text-[#7A291E] shrink-0">
          <UIcon name="i-lucide-lock" class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold tracking-wider uppercase text-[#7A291E]">Section 5</span>
          <h2 class="text-xl font-bold text-[#2A1512]">
            Destinataires & Sécurité des Données
          </h2>
        </div>
      </div>

      <!-- Engagement zéro revente -->
      <div class="p-4 rounded-2xl bg-[#FAF4F2] border border-[#ECCBC4] flex items-start gap-3">
        <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-[#7A291E] shrink-0 mt-0.5" />
        <div class="space-y-1">
          <h3 class="text-sm font-bold text-[#2A1512]">
            Usage strictement interne · Aucune commercialisation
          </h3>
          <p class="text-xs text-[#6E5A52] leading-relaxed">
            Vos informations personnelles sont exclusivement réservées à l'équipe organisatrice du Salon de la Danse et aux administrateurs habilités. <strong class="text-[#2A1512]">Aucune donnée n'est vendue, cédée, échangée ou louée à des tiers</strong>, partenaires commerciaux ou régies publicitaires.
          </p>
        </div>
      </div>

      <!-- Mesures techniques de sécurité -->
      <div class="space-y-3">
        <h3 class="text-sm font-bold text-[#2A1512]">
          Mesures techniques et cryptographiques mises en œuvre
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div class="p-3.5 bg-white rounded-xl border border-[#E6D9CB] space-y-1.5">
            <div class="flex items-center gap-1.5 text-xs font-bold text-[#7A291E]">
              <UIcon name="i-lucide-key-round" class="w-4 h-4" />
              <span>Hachage fort des mots de passe</span>
            </div>
            <p class="text-xs text-[#6E5A52]">
              Algorithmes cryptographiques éprouvés (Argon2 / bcrypt) avec sel aléatoire individuel. Aucun mot de passe n'est jamais stocké en clair.
            </p>
          </div>

          <div class="p-3.5 bg-white rounded-xl border border-[#E6D9CB] space-y-1.5">
            <div class="flex items-center gap-1.5 text-xs font-bold text-[#7A291E]">
              <UIcon name="i-lucide-globe-lock" class="w-4 h-4" />
              <span>Chiffrement HTTPS / TLS</span>
            </div>
            <p class="text-xs text-[#6E5A52]">
              Toutes les données en transit entre votre navigateur et nos serveurs sont chiffrées selon les standards TLS modernes.
            </p>
          </div>

          <div class="p-3.5 bg-white rounded-xl border border-[#E6D9CB] space-y-1.5">
            <div class="flex items-center gap-1.5 text-xs font-bold text-[#7A291E]">
              <UIcon name="i-lucide-user-check" class="w-4 h-4" />
              <span>Contrôle d'accès strict (RBAC)</span>
            </div>
            <p class="text-xs text-[#6E5A52]">
              Cloisonnement étanche des permissions entre rôles Bénévoles et Administrateurs. Authentification protégée par jetons sécurisés.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ======================================================== -->
    <!-- 6. DROITS DES UTILISATEURS (RGPD)                        -->
    <!-- ======================================================== -->
    <section id="droits" class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 space-y-5">
      <div class="flex items-center gap-3 border-b border-[#E6D9CB] pb-4">
        <div class="w-10 h-10 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] flex items-center justify-center text-[#7A291E] shrink-0">
          <UIcon name="i-lucide-user-check" class="w-5 h-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold tracking-wider uppercase text-[#7A291E]">Section 6</span>
          <h2 class="text-xl font-bold text-[#2A1512]">
            Vos Droits & Modalités d'Exercice
          </h2>
        </div>
      </div>

      <p class="text-sm text-[#6E5A52] leading-relaxed">
        Conformément aux Articles 15 à 22 du RGPD, vous disposez d'un ensemble de droits complets sur vos données :
      </p>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div class="p-3 rounded-xl bg-white border border-[#E6D9CB] space-y-1">
          <p class="font-bold text-[#2A1512] flex items-center gap-1.5">
            <UIcon name="i-lucide-eye" class="w-3.5 h-3.5 text-[#7A291E]" />
            <span>Droit d'accès</span>
          </p>
          <p class="text-[#6E5A52]">Obtenir communication de l'ensemble des données enregistrées vous concernant.</p>
        </div>

        <div class="p-3 rounded-xl bg-white border border-[#E6D9CB] space-y-1">
          <p class="font-bold text-[#2A1512] flex items-center gap-1.5">
            <UIcon name="i-lucide-edit-3" class="w-3.5 h-3.5 text-[#7A291E]" />
            <span>Droit de rectification</span>
          </p>
          <p class="text-[#6E5A52]">Mettre à jour ou corriger vos informations personnelles immédiatement.</p>
        </div>

        <div class="p-3 rounded-xl bg-white border border-[#E6D9CB] space-y-1">
          <p class="font-bold text-[#2A1512] flex items-center gap-1.5">
            <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5 text-[#7A291E]" />
            <span>Droit à l'effacement</span>
          </p>
          <p class="text-[#6E5A52]">Demander la suppression complète (« droit à l'oubli ») de votre compte et de vos données.</p>
        </div>

        <div class="p-3 rounded-xl bg-white border border-[#E6D9CB] space-y-1">
          <p class="font-bold text-[#2A1512] flex items-center gap-1.5">
            <UIcon name="i-lucide-pause-circle" class="w-3.5 h-3.5 text-[#7A291E]" />
            <span>Droit à la limitation</span>
          </p>
          <p class="text-[#6E5A52]">Geler temporairement l'utilisation de certaines données en cas de contestation.</p>
        </div>
      </div>

      <!-- Modalité d'exercice simplifiée -->
      <div class="p-5 rounded-2xl bg-[#FAF2EF] border border-[#ECCBC4] space-y-3">
        <h3 class="text-sm font-bold text-[#2A1512] flex items-center gap-2">
          <UIcon name="i-lucide-send" class="w-4 h-4 text-[#7A291E]" />
          <span>Comment exercer simplement vos droits ?</span>
        </h3>
        <p class="text-xs text-[#6E5A52] leading-relaxed">
          Aucune formalité complexe : une simple demande écrite par courriel suffit. Nous nous engageons à vous répondre dans un délai maximal de <strong class="text-[#2A1512]">30 jours</strong>.
        </p>
        <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-1">
          <a
            href="mailto:contact@salondeladanse.fr?subject=Exercice%20de%20droits%20RGPD%20-%20Salon%20de%20la%20Danse"
            class="h-10 px-5 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <UIcon name="i-lucide-mail" class="w-4 h-4" />
            <span>Écrire à contact@salondeladanse.fr</span>
          </a>
          <span class="text-xs text-[#6E5A52]">
            Ou directement auprès des organisateurs lors des permanences de préparation.
          </span>
        </div>
      </div>

      <!-- Recours CNIL -->
      <p class="text-xs text-[#6E5A52] pt-1">
        Si vous estimez que vos droits ne sont pas respectés après nous avoir contactés, vous avez la faculté d'introduire une réclamation auprès de la <strong class="text-[#2A1512]">CNIL</strong> (Commission Nationale de l'Informatique et des Libertés - <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" class="text-[#7A291E] underline">cnil.fr</a>).
      </p>
    </section>

    <!-- ======================================================== -->
    <!-- 7. COOKIES & TRAÇABILITÉ                                -->
    <!-- ======================================================== -->
    <section class="bg-[#FFFCF8] rounded-3xl border border-[#E6D9CB] p-6 sm:p-8 space-y-3">
      <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7A291E]">
        <UIcon name="i-lucide-cookie" class="w-4 h-4" />
        <span>Cookies & Traceurs</span>
      </div>
      <h2 class="text-base font-bold text-[#2A1512]">
        Absence de cookies publicitaires ou de traçage tiers
      </h2>
      <p class="text-xs text-[#6E5A52] leading-relaxed">
        Ce site utilise uniquement des cookies strictement nécessaires au fonctionnement technique de l'application (jeton de session sécurisé, protection CSRF, maintien de la connexion). Aucun cookie tiers de profilage ou de ciblage publicitaire n'est déposé, ce qui vous dispense de tout bandeau d'acceptation intrusif.
      </p>
    </section>

    <!-- ======================================================== -->
    <!-- PIED DE PAGE / ACTION DE RETOUR                         -->
    <!-- ======================================================== -->
    <div class="text-center pt-2 pb-6 space-y-3 no-print">
      <NuxtLink
        :to="backRoute"
        class="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#7A291E] hover:bg-[#5E1F16] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs"
      >
        <UIcon name="i-lucide-arrow-left" class="w-4 h-4" />
        <span>{{ backLabel }}</span>
      </NuxtLink>
      <p class="text-xs text-[#6E5A52]">
        Salon de la Danse Angers · 14, 15 et 16 mai 2027 · Centre de Congrès
      </p>
    </div>
  </div>
</template>
