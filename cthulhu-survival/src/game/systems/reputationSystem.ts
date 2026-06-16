import type { ReputationMap, FactionId } from '../types/faction'
import { createDefaultReputation } from '../types/faction'
import { FACTIONS, getFactionById } from '../data/factions'
import { clamp } from '../utils/random'

const MIN_REPUTATION = -100
const MAX_REPUTATION = 100
const OPPOSED_FACTION_PENALTY_RATE = 0.4

export function modifyReputation(
  reputation: ReputationMap,
  factionId: FactionId,
  delta: number,
): ReputationMap {
  const faction = getFactionById(factionId)
  if (!faction) return reputation

  const newReputation = { ...reputation }
  newReputation[factionId] = clamp(
    (newReputation[factionId] || 0) + delta,
    MIN_REPUTATION,
    MAX_REPUTATION,
  )

  if (delta > 0 && faction.opposedFaction !== factionId) {
    const opposedDelta = -Math.round(delta * OPPOSED_FACTION_PENALTY_RATE)
    newReputation[faction.opposedFaction] = clamp(
      (newReputation[faction.opposedFaction] || 0) + opposedDelta,
      MIN_REPUTATION,
      MAX_REPUTATION,
    )
  }

  return newReputation
}

export function checkReputationRequirement(
  reputation: ReputationMap,
  factionId: FactionId,
  minValue: number,
): boolean {
  return (reputation[factionId] || 0) >= minValue
}

export function checkReputationBelow(
  reputation: ReputationMap,
  factionId: FactionId,
  maxValue: number,
): boolean {
  return (reputation[factionId] || 0) <= maxValue
}

export function getDominantFaction(reputation: ReputationMap): FactionId | null {
  let maxRep = 0
  let dominant: FactionId | null = null
  for (const faction of FACTIONS) {
    const rep = reputation[faction.id] || 0
    if (rep > maxRep) {
      maxRep = rep
      dominant = faction.id
    }
  }
  return dominant
}

export function getFactionReputationSummary(reputation: ReputationMap): {
  factionId: FactionId
  value: number
  level: string
  title: string
  color: string
}[] {
  return FACTIONS.map(f => {
    const value = reputation[f.id] || 0
    const sorted = [...f.reputationLevels].sort((a, b) => b.minReputation - a.minReputation)
    const level = sorted.find(l => value >= l.minReputation) || sorted[sorted.length - 1]
    return {
      factionId: f.id,
      value,
      level: level.name,
      title: level.title,
      color: level.color,
    }
  })
}

export { createDefaultReputation, MIN_REPUTATION, MAX_REPUTATION }
