import { contextBridge, ipcRenderer } from 'electron'

// The renderer gets this and nothing else: no node, no direct IPC, no way to
// reach the filesystem. Every call is a named verb the main process implements.
const on = (channel, fn) => {
  const handler = (_e, payload) => fn(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

contextBridge.exposeInMainWorld('api', {
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    get: (id) => ipcRenderer.invoke('notes:get', id),
    save: (id, content) => ipcRenderer.invoke('notes:save', { id, content }),
    create: () => ipcRenderer.invoke('notes:create'),
    trash: (id) => ipcRenderer.invoke('notes:trash', id),
    onChanged: (fn) => on('notes:changed', fn),
    onNoteChanged: (fn) => on('note:changed', fn),
    // Pushed when the Omarchy plugin runs `scriptorium --note <id>` / `--new`.
    onOpen: (fn) => on('open-note', fn)
  },

  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    pasteToken: (token) => ipcRenderer.invoke('auth:paste-token', token),
    logout: () => ipcRenderer.invoke('auth:logout'),
    onRequired: (fn) => on('auth:required', fn)
  },

  sync: {
    status: () => ipcRenderer.invoke('sync:status'),
    onStatus: (fn) => on('sync:status', fn),
    onError: (fn) => on('sync:error', fn)
  },

  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value)
  },

  theme: {
    omarchy: () => ipcRenderer.invoke('omarchy:style'),
    onOmarchyChanged: (fn) => on('omarchy:changed', fn)
  },

  export: {
    note: (id) => ipcRenderer.invoke('export:note', id),
    all: () => ipcRenderer.invoke('export:all')
  },

  system: {
    addToMenu: () => ipcRenderer.invoke('desktop:install'),
    inMenu: () => ipcRenderer.invoke('desktop:installed'),
    setScale: (scale) => ipcRenderer.invoke('ui:scale', scale),
    setSpellcheck: (on) => ipcRenderer.invoke('ui:spellcheck', on)
  },

  fonts: {
    catalog: () => ipcRenderer.invoke('fonts:catalog'),
    load: (family) => ipcRenderer.invoke('fonts:load', family)
  },

  dictate: {
    available: () => ipcRenderer.invoke('dictate:available'),
    set: (on_) => ipcRenderer.invoke('dictate:set', on_),
    onEvent: (fn) => on('dictate:event', fn)
  }
})
