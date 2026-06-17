import type { ChapterSnapshot, PermanentUnlocks, SnapshotTimeline } from '../types/snapshot'
import type { GrowthAchievement } from '../types/growthTree'
import type { SerializedSave } from '../engine/GameEngine'

const SNAPSHOT_KEY = 'cthulhu_survival_snapshots'
const PERMANENT_KEY = 'cthulhu_survival_permanent'
const MAX_SNAPSHOTS = 50

function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function getTimeline(): SnapshotTimeline {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) {
      return { snapshots: [], currentSnapshotId: null }
    }
    const data = JSON.parse(raw)
    return {
      snapshots: data.snapshots || [],
      currentSnapshotId: data.currentSnapshotId || null,
    }
  } catch {
    return { snapshots: [], currentSnapshotId: null }
  }
}

export function saveTimeline(timeline: SnapshotTimeline): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(timeline))
  } catch {
    console.error('Failed to save timeline')
  }
}

export function addSnapshot(snapshot: ChapterSnapshot): ChapterSnapshot {
  const timeline = getTimeline()
  timeline.snapshots.push(snapshot)
  if (timeline.snapshots.length > MAX_SNAPSHOTS) {
    timeline.snapshots = timeline.snapshots.slice(-MAX_SNAPSHOTS)
  }
  timeline.currentSnapshotId = snapshot.id
  saveTimeline(timeline)
  return snapshot
}

export function getSnapshot(snapshotId: string): ChapterSnapshot | null {
  const timeline = getTimeline()
  return timeline.snapshots.find(s => s.id === snapshotId) || null
}

export function deleteSnapshot(snapshotId: string): boolean {
  const timeline = getTimeline()
  const filtered = timeline.snapshots.filter(s => s.id !== snapshotId)
  if (filtered.length === timeline.snapshots.length) return false
  timeline.snapshots = filtered
  if (timeline.currentSnapshotId === snapshotId) {
    timeline.currentSnapshotId = filtered.length > 0 ? filtered[filtered.length - 1].id : null
  }
  saveTimeline(timeline)
  return true
}

export function clearAllSnapshots(): void {
  localStorage.removeItem(SNAPSHOT_KEY)
}

export function setCurrentSnapshot(snapshotId: string | null): void {
  const timeline = getTimeline()
  timeline.currentSnapshotId = snapshotId
  saveTimeline(timeline)
}

export function createSnapshotFromSave(
  save: SerializedSave,
  eventData: {
    eventId: string
    eventTitle: string
    eventDescription: string
    choiceMade?: { choiceId: string; choiceText: string; success: boolean } | null
    snapshotType?: 'auto' | 'manual'
    isPreEventSnapshot?: boolean
    parentSnapshotId?: string | null
    description?: string
  },
): ChapterSnapshot {
  return {
    id: generateId(),
    timestamp: Date.now(),
    day: save.state.time.day,
    phase: save.state.time.phase,
    eventId: eventData.eventId,
    eventTitle: eventData.eventTitle,
    eventDescription: eventData.eventDescription,
    choiceMade: eventData.choiceMade || null,
    state: JSON.parse(JSON.stringify(save.state)),
    identity: JSON.parse(JSON.stringify(save.identity)),
    inventory: JSON.parse(JSON.stringify(save.inventory)),
    growthProgress: JSON.parse(JSON.stringify(save.growthProgress)),
    snapshotType: eventData.snapshotType || 'auto',
    isPreEventSnapshot: eventData.isPreEventSnapshot || false,
    parentSnapshotId: eventData.parentSnapshotId || null,
    description: eventData.description,
  }
}

export function snapshotToSave(snapshot: ChapterSnapshot): SerializedSave {
  return {
    state: JSON.parse(JSON.stringify(snapshot.state)),
    identity: JSON.parse(JSON.stringify(snapshot.identity)),
    inventory: JSON.parse(JSON.stringify(snapshot.inventory)),
    growthProgress: JSON.parse(JSON.stringify(snapshot.growthProgress)),
    savedAt: snapshot.timestamp,
  }
}

export function getPermanentUnlocks(): PermanentUnlocks {
  try {
    const raw = localStorage.getItem(PERMANENT_KEY)
    if (!raw) {
      return {
        unlockedEndings: [],
        discoveredTiles: [],
        triggeredEvents: [],
        unlockedRecipes: [],
        completedAchievements: [],
      }
    }
    return JSON.parse(raw) as PermanentUnlocks
  } catch {
    return {
      unlockedEndings: [],
      discoveredTiles: [],
      triggeredEvents: [],
      unlockedRecipes: [],
      completedAchievements: [],
    }
  }
}

export function savePermanentUnlocks(unlocks: PermanentUnlocks): void {
  try {
    localStorage.setItem(PERMANENT_KEY, JSON.stringify(unlocks))
  } catch {
    console.error('Failed to save permanent unlocks')
  }
}

export function mergePermanentUnlocks(newUnlocks: Partial<PermanentUnlocks>): PermanentUnlocks {
  const current = getPermanentUnlocks()

  const mergedAchievements: GrowthAchievement[] = [...current.completedAchievements]
  const existingAchievementIds = new Set(current.completedAchievements.map(a => a.id))
  ;(newUnlocks.completedAchievements || []).forEach(a => {
    if (!existingAchievementIds.has(a.id)) {
      mergedAchievements.push(a)
      existingAchievementIds.add(a.id)
    }
  })

  const merged: PermanentUnlocks = {
    unlockedEndings: [...new Set([...current.unlockedEndings, ...(newUnlocks.unlockedEndings || [])])],
    discoveredTiles: [...new Set([...current.discoveredTiles, ...(newUnlocks.discoveredTiles || [])])],
    triggeredEvents: [...new Set([...current.triggeredEvents, ...(newUnlocks.triggeredEvents || [])])],
    unlockedRecipes: [...new Set([...current.unlockedRecipes, ...(newUnlocks.unlockedRecipes || [])])],
    completedAchievements: mergedAchievements,
  }
  savePermanentUnlocks(merged)
  return merged
}

export function rewindToSnapshot(snapshotId: string): { save: SerializedSave; permanentUnlocks: PermanentUnlocks } | null {
  const snapshot = getSnapshot(snapshotId)
  if (!snapshot) return null

  const timeline = getTimeline()
  const snapshotIndex = timeline.snapshots.findIndex(s => s.id === snapshotId)

  let subsequentEvents: string[] = []
  if (snapshotIndex !== -1) {
    for (let i = snapshotIndex + 1; i < timeline.snapshots.length; i++) {
      const snap = timeline.snapshots[i]
      if (snap.eventId && snap.eventId !== 'manual_save') {
        subsequentEvents.push(snap.eventId)
      }
    }
    timeline.snapshots = timeline.snapshots.slice(0, snapshotIndex + 1)
  }

  const permanentUnlocks = getPermanentUnlocks()
  const save = snapshotToSave(snapshot)

  save.state.unlockedEndings = [...new Set([...save.state.unlockedEndings, ...permanentUnlocks.unlockedEndings])]
  save.state.discoveredTiles = [...new Set([...save.state.discoveredTiles, ...permanentUnlocks.discoveredTiles])]

  const excludeEvents = new Set(subsequentEvents)
  if (snapshot.isPreEventSnapshot && snapshot.eventId && snapshot.eventId !== 'manual_save') {
    excludeEvents.add(snapshot.eventId)
  }
  save.state.triggeredEvents = save.state.triggeredEvents.filter(e => !excludeEvents.has(e))
  permanentUnlocks.triggeredEvents.forEach(e => {
    if (!save.state.triggeredEvents.includes(e)) {
      save.state.triggeredEvents.push(e)
    }
  })

  timeline.currentSnapshotId = snapshotId
  saveTimeline(timeline)

  return { save, permanentUnlocks }
}

export function formatSnapshotDate(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${m}-${day} ${h}:${min}`
}
