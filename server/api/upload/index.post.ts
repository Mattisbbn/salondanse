import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getAuthenticatedUser } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  // Optionnel : l'upload peut être appelé avant inscription (formulaire register public), ou par un utilisateur authentifié
  const formData = await readMultipartFormData(event)

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Aucun fichier reçu dans la requête.'
    })
  }

  // Trouver le champ de fichier (name="file" ou premier fichier)
  const file = formData.find(item => item.filename && item.data)

  if (!file || !file.filename || !file.data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le fichier envoyé est invalide ou vide.'
    })
  }

  // Validation du type de fichier (PDF obligatoire)
  const isPdfMime = file.type === 'application/pdf'
  const isPdfExtension = path.extname(file.filename).toLowerCase() === '.pdf'

  if (!isPdfMime && !isPdfExtension) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Format non supporté : seule une autorisation parentale au format PDF est acceptée.'
    })
  }

  // Validation de la taille (max 10 Mo)
  const MAX_SIZE = 10 * 1024 * 1024
  if (file.data.length > MAX_SIZE) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Le document dépasse la taille maximale autorisée de 10 Mo.'
    })
  }

  // Répertoire de destination
  const uploadDir = path.resolve(process.cwd(), 'public', 'uploads', 'parental-authorizations')
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  // Nom sécurisé et unique
  const randomSuffix = crypto.randomBytes(8).toString('hex')
  const safeFilename = `autorisation-parentale-${Date.now()}-${randomSuffix}.pdf`
  const targetPath = path.join(uploadDir, safeFilename)

  // Écriture du fichier sur le disque
  fs.writeFileSync(targetPath, file.data)

  const publicUrl = `/uploads/parental-authorizations/${safeFilename}`

  return {
    success: true,
    message: 'Document téléversé avec succès.',
    url: publicUrl,
    filename: safeFilename,
    originalName: file.filename,
    size: file.data.length
  }
})
