import type { PlayerStats } from '../types/game'
import type { Identity, SkillEffect } from '../types/identity'
import { clamp } from '../utils/random'
import { createInitialAlienation, canTriggerAlienation, triggerAlienation, applyAlienationPhaseEffects, getAlienationBuffs } from './alienationSystem'

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
    alienation: createInitialAlienation(),
  }
}

function aggregateEffectValue(effects: SkillEffect[], type: string): number {
  return effects.reduce((acc, e) => {
    if (e.type === type) return acc + e.value
    return acc
  }, 0)
}

export function applyPollutionEffect(
  stats: PlayerStats,
  pollutionGain: number,
  identity: Identity,
  growthEffects: SkillEffect[] = [],
): PlayerStats {
  let actualGain = pollutionGain
  const pollutionReduction = aggregateEffectValue(
    [...identity.skills.map(s => s.effect), ...growthEffects],
    'reduce_pollution_gain',
  )
  
  const alienationBuffs = getAlienationBuffs(stats.alienation)
  const totalPollutionReduction = pollutionReduction + alienationBuffs.pollutionResistanceBonus
  
  if (actualGain > 0) {
    actualGain = actualGain * (1 - Math.min(totalPollutionReduction, 0.8))
  }

  const newPollution = clamp(stats.pollution + actualGain, 0, 100)
  let newStats = { ...stats, pollution: newPollution }

  if (newPollution >= 80) {
    newStats.sanity = clamp(newStats.sanity - 5, 0, stats.maxSanity)
  } else if (newPollution >= 60) {
    newStats.sanity = clamp(newStats.sanity - 2, 0, stats.maxSanity)
  }

  if (newPollution >= 90) {
    return {
      ...newStats,
      pollution: 100,
      sanity: 0,
    }
  }

  if (canTriggerAlienation(newStats)) {
    newStats = triggerAlienation(newStats, identity, growthEffects)
  }

  return newStats
}

export function applyPhaseEffects(
  stats: PlayerStats,
  isNight: boolean,
  identity: Identity,
  growthEffects: SkillEffect[] = [],
): PlayerStats {
  let newStats = { ...stats }
  const allEffects = [...identity.skills.map(s => s.effect), ...growthEffects]
  const alienationBuffs = getAlienationBuffs(newStats.alienation)

  const hungerReduction = aggregateEffectValue(allEffects, 'reduce_hunger_rate')
  const hungerDrain = Math.round(10 * (1 - hungerReduction))

  const sanityBonus = aggregateEffectValue(allEffects, 'bonus_sanity_recovery')

  newStats.hunger = clamp(newStats.hunger - hungerDrain, 0, 100)
  newStats.energy = clamp(newStats.energy + 5, 0, 100)

  if (isNight) {
    newStats.sanity = clamp(newStats.sanity - 5, 0, newStats.maxSanity)
    const nightPollutionGain = Math.round(3 * (1 - Math.min(alienationBuffs.pollutionResistanceBonus, 0.8)))
    newStats.pollution = clamp(newStats.pollution + nightPollutionGain, 0, 100)
  } else {
    newStats.sanity = clamp(newStats.sanity + 3 + sanityBonus, 0, newStats.maxSanity)
  }

  if (newStats.hunger <= 0) {
    const hungerDamage = Math.max(2, Math.round(10 * (1 - alienationBuffs.strengthBonus * 0.5)))
    newStats.hp = clamp(newStats.hp - hungerDamage, 0, newStats.maxHp)
    newStats.sanity = clamp(newStats.sanity - 5, 0, newStats.maxSanity)
  }

  if (newStats.energy <= 0) {
    const energyDamage = Math.max(1, Math.round(5 * (1 - alienationBuffs.strengthBonus * 0.5)))
    newStats.hp = clamp(newStats.hp - energyDamage, 0, newStats.maxHp)
    newStats.sanity = clamp(newStats.sanity - 3, 0, newStats.maxSanity)
  }

  newStats = applyAlienationPhaseEffects(newStats, isNight, identity, growthEffects)

  if (canTriggerAlienation(newStats)) {
    newStats = triggerAlienation(newStats, identity, growthEffects)
  }

  return newStats
}

export function modifyHp(stats: PlayerStats, amount: number, identity: Identity, growthEffects: SkillEffect[] = []): PlayerStats {
  let actualAmount = amount
  const damageReduction = aggregateEffectValue(
    [...identity.skills.map(s => s.effect), ...growthEffects],
    'reduce_damage_taken',
  )
  const alienationBuffs = getAlienationBuffs(stats.alienation)
  
  if (amount < 0) {
    const totalDamageReduction = damageReduction + alienationBuffs.strengthBonus * 0.5
    actualAmount = amount * (1 - Math.min(totalDamageReduction, 0.7))
  } else {
    actualAmount = amount * (1 + alienationBuffs.strengthBonus * 0.3)
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
