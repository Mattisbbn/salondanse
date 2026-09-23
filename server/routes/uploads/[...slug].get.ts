import fs from 'node:fs'
import path from 'node:path'
import { sendStream } from 'h3'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug') || ''
  const sanitizedPath = slug.replace(/\.\./g, '') // Empêcher path traversal

  const filePath = path.resolve(process.cwd(), 'public', 'uploads', sanitizedPath)

  if (!fs.existsSync(filePath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Fichier introuvable.'
    })
  }

  const stat = fs.statSync(filePath)
  if (!stat.isFile()) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Ressource introuvable.'
    })
  }

  const ext = path.extname(filePath).toLowerCase()
  let contentType = 'application/octet-stream'
  if (ext === '.pdf') {
    contentType = 'application/pdf'
  } else if (ext === '.png') {
    contentType = 'image/png'
  } else if (ext === '.jpg' || ext === '.jpeg') {
    contentType = 'image/jpeg'
  }

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Content-Length', stat.size)
  setResponseHeader(event, 'Content-Disposition', `inline; filename="${path.basename(filePath)}"`)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')

  return sendStream(event, fs.createReadStream(filePath))
})
