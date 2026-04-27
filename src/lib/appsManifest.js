/**
 * Carrega o manifesto de apps em runtime (public/apps.manifest.json).
 * Edite URLs/repos ali para aparecer novos ícones no desktop.
 */

const MANIFEST_URL = '/apps.manifest.json'

/** @typedef {'iframe' | 'internal'} AppManifestType */

/**
 * @typedef {Object} AppManifestEntry
 * @property {string} id
 * @property {string} name
 * @property {string} [iconEmoji]
 * @property {string} [iconUrl]
 * @property {AppManifestType} type
 * @property {string} [entryUrl] URL do app hospedado (Vercel etc.)
 * @property {string} [repoUrl] Repositório GitHub (referência / futura integração CI)
 * @property {string} [internalId] Quando type === 'internal'
 * @property {boolean} [fullscreenDefault]
 */

/**
 * @returns {Promise<{ version: number, apps: AppManifestEntry[] }>}
 */
export async function loadAppsManifest() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Manifesto inválido: ${res.status}`)
  const data = await res.json()
  if (!data || !Array.isArray(data.apps)) {
    throw new Error('apps.manifest.json precisa de { "apps": [...] }')
  }
  return data
}
