export type DefenseStrategy = 'patrol' | 'fortify' | 'rest' | 'vigil'

export type TrapSlot = 'north' | 'east' | 'south' | 'west'

export interface PlacedTrap {
  slot: TrapSlot
  itemId: string
  name: string
  damage: number
  sanityDamage: number
  trapType: 'physical' | 'holy' | 'eldritch'
  consumed: boolean
}

export interface SupplyAllocation {
  foodUsed: number
  torchUsed: number
  herbUsed: number
}

export interface NightDefenseConfig {
  strategy: DefenseStrategy
  traps: PlacedTrap[]
  supplies: SupplyAllocation
  defenseActionsSpent: number
  maxDefenseActions: number
}

export interface InvasionWave {
  direction: TrapSlot
  strength: number
  type: 'physical' | 'eldritch' | 'mixed'
  damage: number
  sanityDamage: number
  pollutionDamage: number
  trapTriggered: boolean
  trapDamage: number
  netDamage: number
  netSanityDamage: number
  netPollutionDamage: number
  description: string
}

export interface NightDefenseResult {
  waves: InvasionWave[]
  totalHpDamage: number
  totalSanityDamage: number
  totalPollutionDamage: number
  trapsConsumed: string[]
  suppliesConsumed: SupplyAllocation
  campDamage: number
  safetyModifier: number
  defenseRating: 'perfect' | 'good' | 'mediocre' | 'poor' | 'disaster'
  messages: string[]
}

export interface NightDefenseState {
  active: boolean
  config: NightDefenseConfig
  result: NightDefenseResult | null
  completed: boolean
}

export const DEFENSE_STRATEGY_INFO: Record<DefenseStrategy, { name: string; description: string; icon: string; defenseBonus: number; sanityEffect: number; energyEffect: number }> = {
  patrol: {
    name: '巡逻',
    description: '主动巡逻周边，提前发现威胁但消耗更多精力',
    icon: '🚶',
    defenseBonus: 0.15,
    sanityEffect: -3,
    energyEffect: -15,
  },
  fortify: {
    name: '固守',
    description: '加固营地防御，大幅降低受到的伤害',
    icon: '🏰',
    defenseBonus: 0.3,
    sanityEffect: 0,
    energyEffect: -5,
  },
  rest: {
    name: '休整',
    description: '以休息为主，恢复精力但防御薄弱',
    icon: '💤',
    defenseBonus: -0.15,
    sanityEffect: 5,
    energyEffect: 20,
  },
  vigil: {
    name: '警戒',
    description: '整夜保持高度警觉，防御极强但精神损耗巨大',
    icon: '👁️',
    defenseBonus: 0.45,
    sanityEffect: -8,
    energyEffect: -10,
  },
}

export const TRAP_SLOT_LABELS: Record<TrapSlot, string> = {
  north: '北面',
  east: '东面',
  south: '南面',
  west: '西面',
}

export const DEFENSE_ITEM_MAP: Record<string, { damage: number; sanityDamage: number; trapType: PlacedTrap['trapType'] }> = {
  spike_barrier: { damage: 20, sanityDamage: 0, trapType: 'physical' },
  alarm_tripwire: { damage: 5, sanityDamage: 0, trapType: 'physical' },
  holy_ward: { damage: 15, sanityDamage: 10, trapType: 'holy' },
  eldritch_trap: { damage: 30, sanityDamage: -5, trapType: 'eldritch' },
  hunting_knife: { damage: 12, sanityDamage: 0, trapType: 'physical' },
  arrow: { damage: 8, sanityDamage: 0, trapType: 'physical' },
  torch: { damage: 10, sanityDamage: 5, trapType: 'physical' },
  ancient_rune: { damage: 20, sanityDamage: 15, trapType: 'holy' },
}

export function createInitialNightDefense(maxDefenseActions: number = 3): NightDefenseState {
  return {
    active: false,
    config: {
      strategy: 'fortify',
      traps: [],
      supplies: { foodUsed: 0, torchUsed: 0, herbUsed: 0 },
      defenseActionsSpent: 0,
      maxDefenseActions,
    },
    result: null,
    completed: false,
  }
}
