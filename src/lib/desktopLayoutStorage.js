const STORAGE_KEY = 'eullon_webos_desktop_layout_v1'

export const ROOT_FOLDER_ID = 'desktop'

/** @typedef {{ id: string, name: string }} DesktopFolder */

/**
 * @typedef {Object} DesktopLayout
 * @property {string[]} hiddenIds
 * @property {DesktopFolder[]} folders
 * @property {Record<string, string>} folderByAppId
 * @property {string} activeFolderId
 * @property {Record<string, string>} aliases
 */

function defaultFolders() {
  return [{ id: ROOT_FOLDER_ID, name: 'Área de trabalho' }]
}

/** @returns {DesktopLayout} */
export function loadDesktopLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        hiddenIds: [],
        folders: defaultFolders(),
        folderByAppId: {},
        activeFolderId: ROOT_FOLDER_ID,
        aliases: {},
      }
    }
    const d = JSON.parse(raw)
    const folders = Array.isArray(d.folders) && d.folders.length ? d.folders : defaultFolders()
    const hasRoot = folders.some((f) => f.id === ROOT_FOLDER_ID)
    return {
      hiddenIds: Array.isArray(d.hiddenIds) ? d.hiddenIds : [],
      folders: hasRoot ? folders : [defaultFolders()[0], ...folders],
      folderByAppId:
        d.folderByAppId && typeof d.folderByAppId === 'object' ? d.folderByAppId : {},
      activeFolderId:
        typeof d.activeFolderId === 'string' ? d.activeFolderId : ROOT_FOLDER_ID,
      aliases: d.aliases && typeof d.aliases === 'object' ? d.aliases : {},
    }
  } catch {
    return {
      hiddenIds: [],
      folders: defaultFolders(),
      folderByAppId: {},
      activeFolderId: ROOT_FOLDER_ID,
      aliases: {},
    }
  }
}

/** @param {DesktopLayout} layout */
export function saveDesktopLayout(layout) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      hiddenIds: layout.hiddenIds,
      folders: layout.folders,
      folderByAppId: layout.folderByAppId,
      activeFolderId: layout.activeFolderId,
      aliases: layout.aliases,
    }),
  )
}
