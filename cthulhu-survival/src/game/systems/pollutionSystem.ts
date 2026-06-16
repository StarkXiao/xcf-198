import type { PlayerStats } from '../types/game'
import type { Identity } from '../types/identity'
import { clamp } from '../utils/random'

export function createInitialStats(identity: Identity): PlayerStats {
  const s = identity.baseStats
  return {
    hp: s.maxHp,
    maxHp: s.maxHp,
    sanity: s.maxSanity,
    maxSanity: s.maxSanity,
    pollution: s.startPollution,
    hunger: s.startHunger,
    energy: s.startEnergy,
  }
}

export function applyPollutionEffect(
  stats: PlayerStats,
  pollutionGain: number,
  identity: Identity,
): PlayerStats {
  let actualGain = pollutionGain
  const pollutionReduction = identity.skills.reduce((acc, s) => {
    if (s.effect.type === 'reduce_pollution_gain') return acc + s.effect.value
    return acc
  }, 0)
  if (actualGain > 0) {
    actualGain = actualGain * (1 - pollutionReduction)
  }

  const newPollution = clamp(stats.pollution + actualGain, 0, 100)
  let newSanity = stats.sanity

  if (newPollution >= 80) {
    newSanity = clamp(newSanity - 5, 0, stats.maxSanity)
  } else if (newPollution >= 60) {
    newSanity = clamp(newSanity - 2, 0, stats.maxSanity)
  }

  if (newPollution >= 90) {
    return {
      ...stats,
      pollution: 100,
      sanity: 0,
    }
  }

  return {
    ...stats,
    pollution: newPollution,
    sanity: newSanity,
  }
}

export function applyPhaseEffects(
  stats: PlayerStats,
  isNight: boolean,
  identity: Identity,
): PlayerStats {
  let newStats = { ...stats }

  const hungerReduction = identity.skills.reduce((acc, s) => {
    if (s.effect.type === 'reduce_hunger_rate') return acc + s.effect.value
    return acc
  }, 0)
  const hungerDrain = Math.round(10 * (1 - hungerReduction))

  const sanityBonus = identity.skills.reduce((acc, s) => {
    if (s.effect.type === 'bonus_sanity_recovery') return acc + s.effect.value
    return acc
  }, 0)

  newStats.hunger = clamp(newStats.hunger - hungerDrain, 0, 100)
  newStats.energy = clamp(newStats.energy + 5, 0, 100)

  if (isNight) {
    newStats.sanity = clamp(newStats.sanity - 5, 0, newStats.maxSanity)
    newStats.pollution = clamp(newStats.pollution + 3, 0, 100)
  } else {
    newStats.sanity = clamp(newStats.sanity + 3 + sanityBonus, 0, newStats.maxSanity)
  }

  if (newStats.hunger <= 0) {
    newStats.hp = clamp(newStats.hp - 10, 0, newStats.maxHp)
    newStats.sanity = clamp(newStats.sanity - 5, 0, newStats.maxSanity)
  }

  if (newStats.energy <= 0) {
    newStats.hp = clamp(newStats.hp - 5, 0, newStats.maxHp)
    newStats.sanity = clamp(newStats.sanity - 3, 0, newStats.maxSanity)
  }

  return newStats
}

export function modifyHp(stats: PlayerStats, amount: number, identity: Identity): PlayerStats {
  let actualAmount = amount
  const damageReduction = identity.skills.reduce((acc, s) => {
    if (s.effect.type === 'reduce_damage_taken' && amount < 0) return acc + s.effect.value
    return acc
  }, 0)
  if (amount < 0) {
    actualAmount = amount * (1 - damageReduction)
  }
  return {
    ...stats,
    hp: clamp(stats.hp + actualAmount, 0, stats.maxHp),
  }
}

export function modifySanity(stats: PlayerStats, amount: number): PlayerStats {
  return {
    ...stats,
    sanity: clamp(stats.sanity + amount, 0, stats.maxSanity),
  }
}

export function modifyHunger(stats: PlayerStats, amount: number): PlayerStats {
  return {
    ...stats,
    hunger: clamp(stats.hunger + amount, 0, 100),
  }
}

export function modifyEnergy(stats: PlayerStats, amount: number): PlayerStats {
  return {
    ...stats,
    energy: clamp(stats.energy + amount, 0, 100),
  }
}

export function getPollutionLevel(pollution: number): { level: string; description: string; color: string } {
  if (pollution < 20) return { level: '纯净', description: '你的身心尚未受到侵蚀', color: '#5ec98a' }
  if (pollution < 40) return { level: '轻微', description: '你偶尔会感到一阵恶寒', color: '#d9a54c' }
  if (pollution < 60) return { level: '中度', description: '你的皮肤上开始出现诡异的纹路', color: '#e68a4c' }
  if (pollution < 80) return { level: '严重', description: '你时常会看到不存在的东西', color: '#c44a4a' }
  return { level: '极重', description: '你已经不再是人类了...吗？', color: '#8a5abf' }
}

export function isStatsCritical(stats: PlayerStats): boolean {
  return stats.hp <= 0 || stats.sanity <= 0
}
