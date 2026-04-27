const MANIFEST_URL = '/my-projects.json'

/**
 * @typedef {{ id: string, name: string, description?: string, url: string, iconEmoji?: string }} MyProjectEntry
 */

/**
 * @returns {Promise<{ version: number, projects: MyProjectEntry[] }>}
 */
export async function loadMyProjectsManifest() {
  const res = await fetch(MANIFEST_URL, { cache: 'no-store' })
  if (!res.ok) throw new Error(`my-projects.json: ${res.status}`)
  const data = await res.json()
  if (!data || !Array.isArray(data.projects)) {
    throw new Error('my-projects.json precisa de { "projects": [...] }')
  }
  return data
}
