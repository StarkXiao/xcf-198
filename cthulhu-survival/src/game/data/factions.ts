import type { Faction, FactionId, ReputationLevel } from '../types/faction'

export const FACTIONS: Faction[] = [
  {
    id: 'monastery',
    name: '修道院',
    icon: '⛪',
    description: '信仰光明与秩序的修道者，致力于对抗旧日支配者的侵蚀，守护人类最后的圣火。',
    lore: '"在黑暗中，唯有信仰是灯塔。我们以圣火之名，驱逐一切亵渎之物。"',
    opposedFaction: 'deep_ones',
    reputationLevels: [
      { minReputation: -100, name: '异端', title: '被审判者', color: '#c44a4a' },
      { minReputation: -30, name: '疏远', title: '不受信任者', color: '#d9a54c' },
      { minReputation: 0, name: '陌生', title: '无名旅人', color: '#888888' },
      { minReputation: 30, name: '友善', title: '虔诚追寻者', color: '#7abf5a' },
      { minReputation: 60, name: '尊敬', title: '圣殿守卫', color: '#5ec98a' },
      { minReputation: 85, name: '崇敬', title: '圣火执掌者', color: '#ffd700' },
    ],
  },
  {
    id: 'deep_ones',
    name: '深潜者',
    icon: '🐙',
    description: '崇拜深渊存在的秘密教团，他们相信旧日支配者的苏醒是进化的终点，禁忌知识是通向真理的唯一道路。',
    lore: '"Ph\'nglui mglw\'nafh Cthulhu R\'lyeh wgah\'nagl fhtagn... 当祂苏醒之时，吾等将获永生。"',
    opposedFaction: 'monastery',
    reputationLevels: [
      { minReputation: -100, name: '排斥', title: '亵渎者', color: '#c44a4a' },
      { minReputation: -30, name: '冷漠', title: '无知凡人', color: '#d9a54c' },
      { minReputation: 0, name: '陌生', title: '未知者', color: '#888888' },
      { minReputation: 30, name: '认可', title: '深渊注视者', color: '#8a5abf' },
      { minReputation: 60, name: '亲密', title: '深渊眷属', color: '#6a3abf' },
      { minReputation: 85, name: '崇拜', title: '旧日代言人', color: '#9b59b6' },
    ],
  },
  {
    id: 'watchers',
    name: '守望者',
    icon: '👁️',
    description: '中立的观察者组织，记录世间万象、平衡各方势力。他们既不信仰光明，也不崇拜深渊，只追求真相与均衡。',
    lore: '"我们见证一切，却不干预一切。直到天平彻底倾斜的那一刻。"',
    opposedFaction: 'watchers',
    reputationLevels: [
      { minReputation: -100, name: '敌视', title: '被除名者', color: '#c44a4a' },
      { minReputation: -30, name: '警惕', title: '不稳定因素', color: '#d9a54c' },
      { minReputation: 0, name: '陌生', title: '外界来客', color: '#888888' },
      { minReputation: 30, name: '信赖', title: '编外干员', color: '#5a9abf' },
      { minReputation: 60, name: '核心', title: '守望之眼', color: '#3a7abf' },
      { minReputation: 85, name: '领袖', title: '天平执掌者', color: '#2980b9' },
    ],
  },
]

export function getFactionById(id: FactionId): Faction | undefined {
  return FACTIONS.find(f => f.id === id)
}

export function getReputationLevel(factionId: FactionId, reputation: number): ReputationLevel {
  const faction = getFactionById(factionId)
  if (!faction) return { minReputation: 0, name: '未知', title: '未知', color: '#888' }
  const sorted = [...faction.reputationLevels].sort((a, b) => b.minReputation - a.minReputation)
  return sorted.find(l => reputation >= l.minReputation) || sorted[sorted.length - 1]
}

export function getReputationChangeDescription(factionId: FactionId, value: number): string {
  const faction = getFactionById(factionId)
  if (!faction) return ''
  const sign = value > 0 ? '+' : ''
  return `${faction.icon} ${faction.name}声望 ${sign}${value}`
}
