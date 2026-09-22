<script setup lang="ts">
useHead({
  title: 'Badges & Exports · Admin'
})
</script>

<template>
  <div class="space-y-6 max-w-4xl">
    <div class="pb-4 border-b border-slate-200">
      <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
        Badges & Exports
      </h1>
      <p class="text-xs sm:text-sm text-slate-500 mt-0.5">
        Exports de données et récapitulatifs pour le Salon de la Danse d'Angers 2027
      </p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Carte Export CSV Bénévoles -->
      <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UIcon
              name="i-lucide-file-spreadsheet"
              class="w-5 h-5"
            />
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-900">
              Liste complète des bénévoles (CSV)
            </h2>
            <span class="text-xs text-slate-500">Format UTF-8 séparateur point-virgule</span>
          </div>
        </div>

        <p class="text-xs text-slate-600 leading-relaxed">
          Téléchargez l'export complet incluant l'identité, les coordonnées téléphoniques et e-mail, les statuts de planning et le détail exhaustif de tous les créneaux affectés.
        </p>

        <div class="pt-2">
          <UButton
            to="/api/admin/exports/volunteers?format=csv"
            external
            color="primary"
            variant="solid"
            size="sm"
            icon="i-lucide-download"
            label="Télécharger le fichier CSV"
            class="font-semibold shadow-xs"
          />
        </div>
      </div>

      <!-- Carte Badges & Fiches de poste -->
      <div class="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold">
            <UIcon
              name="i-lucide-id-card"
              class="w-5 h-5"
            />
          </div>
          <div>
            <h2 class="text-sm sm:text-base font-bold text-slate-900">
              Fiches de mission & Badges
            </h2>
            <span class="text-xs text-slate-500">Impression A4 & PDF individuels</span>
          </div>
        </div>

        <p class="text-xs text-slate-600 leading-relaxed">
          Chaque bénévole dispose d'une fiche récapitulative imprimable A4 prête à l'emploi directement depuis son espace personnel avec les consignes et lieux de rendez-vous.
        </p>

        <div class="pt-2">
          <UButton
            to="/admin/volunteers"
            color="neutral"
            variant="subtle"
            size="sm"
            icon="i-lucide-users"
            label="Accéder aux plannings bénévoles"
          />
        </div>
      </div>
    </div>
  </div>
</template>
