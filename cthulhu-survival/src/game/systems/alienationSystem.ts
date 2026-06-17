import type { PlayerStats, AlienationState, AlienationBuffs, AlienationDebuffs } from '../types/game'
import type { Identity, SkillEffect } from '../types/identity'
import { clamp } from '../utils/random'

export function createInitialAlienation(): AlienationState {
  return {
    active: false,
    level: 0,
    duration: 0,
    maxDuration: 0,
    permanentCorruption: 0,
  }
}

export function getAlienationBuffs(alienation: AlienationState): AlienationBuffs {
  if (!alienation.active || alienation.level <= 0) {
    return {
      maxHpBonus: 0,
      strengthBonus: 0,
      speedBonus: 0,
      pollutionResistanceBonus: 0,
      lootBonus: 0,
    }
  }

  const level = alienation.level
  return {
    maxHpBonus: Math.floor(level * 10),
    strengthBonus: level * 0.1,
    speedBonus: level * 0.15,
    pollutionResistanceBonus: level * 0.1,
    lootBonus: level * 0.2,
  }
}

export function getAlienationDebuffs(alienation: AlienationState): AlienationDebuffs {
  const permanentLevel = alienation.permanentCorruption
  const activeLevel = alienation.active ? alienation.level : 0
  const totalLevel = permanentLevel + activeLevel * 0.5

  return {
    sanityDrainPerPhase: Math.floor(totalLevel * 2),
    maxSanityReduction: Math.floor(permanentLevel * 5),
    hungerIncrease: Math.floor(totalLevel * 1.5),
    socialPenalty: Math.floor(permanentLevel * 3),
  }
}

export function canTriggerAlienation(stats: PlayerStats): boolean {
  return stats.pollution >= 80 && !stats.alienation.active && stats.alienation.level < 5
}

export function triggerAlienation(
  stats: PlayerStats,
  identity: Identity,
  _growthEffects: SkillEffect[] = [],
): PlayerStats {
  if (!canTriggerAlienation(stats)) return stats

  const newAlienation: AlienationState = {
    ...stats.alienation,
    active: true,
    level: Math.min(stats.alienation.level + 1, 5),
    duration: 3,
    maxDuration: 3,
    permanentCorruption: stats.alienation.permanentCorruption + 0.5,
  }

  const buffs = getAlienationBuffs(newAlienation)
  const debuffs = getAlienationDebuffs(newAlienation)

  const newMaxHp = identity.baseStats.maxHp + buffs.maxHpBonus
  const newMaxSanity = identity.baseStats.maxSanity - debuffs.maxSanityReduction

  return {
    ...stats,
    maxHp: newMaxHp,
    hp: clamp(stats.hp + buffs.maxHpBonus, 0, newMaxHp),
    maxSanity: Math.max(newMaxSanity, 10),
    sanity: clamp(stats.sanity, 0, Math.max(newMaxSanity, 10)),
    alienation: newAlienation,
  }
}

export function applyAlienationPhaseEffects(
  stats: PlayerStats,
  _isNight: boolean,
  identity: Identity,
  _growthEffects: SkillEffect[] = [],
): PlayerStats {
  let newStats = { ...stats }

  if (!newStats.alienation.active) {
    return newStats
  }

  const debuffs = getAlienationDebuffs(newStats.alienation)

  newStats.sanity = clamp(newStats.sanity - debuffs.sanityDrainPerPhase, 0, newStats.maxSanity)
  newStats.hunger = clamp(newStats.hunger - debuffs.hungerIncrease, 0, 100)

  newStats.alienation = {
    ...newStats.alienation,
    duration: newStats.alienation.duration - 1,
  }

  if (newStats.alienation.duration <= 0) {
    newStats = endAlienation(newStats, identity, _growthEffects)
  }

  return newStats
}

export function endAlienation(
  stats: PlayerStats,
  identity: Identity,
  _growthEffects: SkillEffect[] = [],
): PlayerStats {
  const newAlienation: AlienationState = {
    ...stats.alienation,
    active: false,
    duration: 0,
    maxDuration: 0,
  }

  const permanentDebuffs = getAlienationDebuffs(newAlienation)
  const newMaxSanity = identity.baseStats.maxSanity - permanentDebuffs.maxSanityReduction

  return {
    ...stats,
    maxHp: identity.baseStats.maxHp,
    hp: clamp(stats.hp, 0, identity.baseStats.maxHp),
    maxSanity: Math.max(newMaxSanity, 10),
    sanity: clamp(stats.sanity, 0, Math.max(newMaxSanity, 10)),
    alienation: newAlienation,
  }
}

export function getAlienationLevelInfo(level: number): {
  name: string
  description: string
  color: string
} {
  if (level <= 0) {
    return { name: '凡人', description: '你仍是普通的人类', color: '#ffffff' }
  }
  if (level === 1) {
    return { name: '初醒', description: '你的感官变得敏锐，但偶尔会看到不该看的东西', color: '#8a5abf' }
  }
  if (level === 2) {
    return { name: '蜕变', description: '身体开始发生微妙的变化，力量和速度都有所提升', color: '#a84ac4' }
  }
  if (level === 3) {
    return { name: '异化', description: '你已经不再是纯粹的人类了...但力量是真实的', color: '#c44a8a' }
  }
  if (level === 4) {
    return { name: '深渊之裔', description: '深渊的血脉在你体内流淌，凡人的规则不再束缚你', color: '#d94a4a' }
  }
  return { name: '超越者', description: '你已接近那些不可名状的存在...你还能称之为人吗？', color: '#ff4a4a' }
}

export function getAlienationStatus(alienation: AlienationState): {
  isActive: boolean
  levelName: string
  description: string
  color: string
  durationText: string
  permanentCorruption: number
} {
  const levelInfo = getAlienationLevelInfo(alienation.level + Math.floor(alienation.permanentCorruption))
  
  let durationText = ''
  if (alienation.active) {
    durationText = `剩余 ${alienation.duration} 阶段`
  } else if (alienation.permanentCorruption > 0) {
    durationText = '永久异化'
  }

  return {
    isActive: alienation.active,
    levelName: levelInfo.name,
    description: levelInfo.description,
    color: levelInfo.color,
    durationText,
    permanentCorruption: alienation.permanentCorruption,
  }
}

export function modifyAlienationLevel(
  stats: PlayerStats,
  amount: number,
): PlayerStats {
  const newLevel = clamp(stats.alienation.level + amount, 0, 5)
  return {
    ...stats,
    alienation: {
      ...stats.alienation,
      level: newLevel,
    },
  }
}

export function modifyPermanentCorruption(
  stats: PlayerStats,
  amount: number,
): PlayerStats {
  const newCorruption = clamp(stats.alienation.permanentCorruption + amount, 0, 5)
  return {
    ...stats,
    alienation: {
      ...stats.alienation,
      permanentCorruption: newCorruption,
    },
  }
}
