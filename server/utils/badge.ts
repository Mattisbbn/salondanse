import type { H3Event } from 'h3'
import QRCode from 'qrcode'

/**
 * Récupère l'URL de base absolue du site web pour les liens publics et QR codes.
 * Priorité :
 * 1. useRuntimeConfig().public.siteUrl
 * 2. process.env.SITE_URL
 * 3. Fallback officiel : https://salondeladanse.mattisbabin.fr
 */
export function getSiteBaseUrl(event?: H3Event): string {
  let baseUrl = ''

  try {
    const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
    baseUrl = (config?.public?.siteUrl as string) || ''
  } catch {
    // Hors contexte Nuxt/Nitro
  }

  if (!baseUrl) {
    baseUrl = process.env.SITE_URL || 'https://salondeladanse.mattisbabin.fr'
  }

  // Si on est en production ou si l'hôte est explicitement configuré, s'assurer que c'est une URL valide
  return baseUrl.trim().replace(/\/+$/, '')
}

/**
 * Construit l'URL absolue complète de vérification d'un badge bénévole.
 * Ne JAMAIS générer une URL relative, car un appareil photo / lecteur mobile
 * requiert le protocole HTTP(S) et le nom de domaine pour ouvrir la page.
 *
 * Format : `${baseUrl}/verify-badge?userId=${userId}`
 */
export function buildBadgeVerifyUrl(userId: string, event?: H3Event): string {
  const baseUrl = getSiteBaseUrl(event)
  return `${baseUrl}/verify-badge?userId=${encodeURIComponent(userId)}`
}

/**
 * Génère le QR Code du badge bénévole encodant l'URL absolue.
 * Renvoie l'URL absolue encodée (verifyUrl) et le Data URL de l'image (qrCodeUrl).
 */
export async function generateBadgeQrCode(
  userId: string,
  event?: H3Event,
  options: { width?: number; margin?: number } = {}
): Promise<{ verifyUrl: string; qrCodeUrl: string }> {
  const verifyUrl = buildBadgeVerifyUrl(userId, event)

  let qrCodeUrl = ''
  try {
    qrCodeUrl = await QRCode.toDataURL(verifyUrl, {
      margin: options.margin ?? 1,
      width: options.width ?? 400,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF'
      }
    })
  } catch (err: unknown) {
    console.error(`[Badge] Erreur de génération du QR code pour le bénévole ${userId}:`, err)
  }

  return {
    verifyUrl,
    qrCodeUrl
  }
}
