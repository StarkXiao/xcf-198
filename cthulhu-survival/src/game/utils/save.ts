import type { SerializedSave } from '../engine/GameEngine'

const SAVE_KEY = 'cthulhu_survival_saves'
const MAX_SLOTS = 5

export interface SaveSlot {
  id: number
  name: string
  data: SerializedSave
  savedAt: number
}

export function getAllSaves(): SaveSlot[] {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SaveSlot[]
  } catch {
    return []
  }
}

export function getSave(slotId: number): SaveSlot | null {
  const saves = getAllSaves()
  return saves.find(s => s.id === slotId) || null
}

export function writeSave(slotId: number, name: string, data: SerializedSave): SaveSlot {
  const saves = getAllSaves()
  const slot: SaveSlot = {
    id: slotId,
    name,
    data,
    savedAt: Date.now(),
  }
  const existingIdx = saves.findIndex(s => s.id === slotId)
  if (existingIdx !== -1) {
    saves[existingIdx] = slot
  } else {
    saves.push(slot)
  }
  saves.sort((a, b) => a.id - b.id)
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves.slice(0, MAX_SLOTS)))
  return slot
}

export function deleteSave(slotId: number): boolean {
  const saves = getAllSaves()
  const filtered = saves.filter(s => s.id !== slotId)
  if (filtered.length === saves.length) return false
  localStorage.setItem(SAVE_KEY, JSON.stringify(filtered))
  return true
}

export function formatDate(ts: number): string {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}`
}
