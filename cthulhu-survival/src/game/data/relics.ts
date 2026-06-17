import type { Relic } from '../types/relic'

export const RELICS: Relic[] = [
  // ============== 大学教授遗物 ==============
  {
    id: 'scholar_ancient_scroll',
    name: '远古卷轴残页',
    icon: '📜',
    rarity: 'rare',
    category: 'resource',
    description: '一张来自远古文明的卷轴残页，记载着失传的知识。能够让你在开局时拥有更多研究资源，并解锁部分神秘配方。',
    lore: '"...那些文字不属于任何已知文明，却不知为何，你能够读懂其中的只言片语..."',
    availableFor: ['scholar'],
    effects: [
      {
        type: 'bonus_start_items',
        items: [
          { itemId: 'ancient_rune', count: 3 },
          { itemId: 'old_book', count: 1 },
          { itemId: 'quill_pen', count: 2 },
        ],
      },
      {
        type: 'modify_base_stats',
        stats: { maxSanity: 15, startPollution: 5 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_ancient_scroll',
        flagValue: true,
      },
      {
        type: 'set_start_flag',
        flag: 'unlock_ancient_alchemy',
        flagValue: true,
      },
      {
        type: 'reveal_tiles',
        tileIds: ['ruins_1', 'ruins_2'],
      },
      {
        type: 'bonus_craft_success',
        value: 0.1,
      },
    ],
  },
  {
    id: 'scholar_silver_key',
    name: '银之钥',
    icon: '🗝️',
    rarity: 'legendary',
    category: 'story',
    description: '一把闪烁着银光的神秘钥匙，据说能打开通往知识之门。改变你的初始位置，让你从古代遗迹附近开始冒险，并与守望者建立初步联系。',
    lore: '"那把钥匙在你的掌心微微发热，仿佛在指引你前往某个不该存在的地方..."',
    availableFor: ['scholar'],
    effects: [
      {
        type: 'modify_start_position',
        position: { x: 5, y: 2 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_silver_key',
        flagValue: true,
      },
      {
        type: 'bonus_start_reputation',
        factionId: 'watchers',
        reputation: 15,
      },
      {
        type: 'reveal_tiles',
        tileIds: ['shrine_1', 'ruins_1', 'cave_1'],
      },
      {
        type: 'trigger_start_event',
        eventId: 'event_silver_key_vision',
      },
      {
        type: 'bonus_start_items',
        items: [{ itemId: 'observer_crystal', count: 1 }],
      },
    ],
  },

  // ============== 私家侦探遗物 ==============
  {
    id: 'detective_leather_bag',
    name: '磨损的皮制工具包',
    icon: '🎒',
    rarity: 'common',
    category: 'resource',
    description: '跟随你多年的老伙计，里面装满了调查用的工具。让你在开局时拥有更多实用物资，能够更好地应对初期的生存挑战。',
    lore: '"这包跟着你破过多少案子？你自己都数不清了。而这一次，它将派上完全不同的用场..."',
    availableFor: ['detective'],
    effects: [
      {
        type: 'bonus_start_items',
        items: [
          { itemId: 'bullet', count: 5 },
          { itemId: 'rope', count: 2 },
          { itemId: 'torch', count: 2 },
          { itemId: 'bandage', count: 3 },
        ],
      },
      {
        type: 'modify_base_stats',
        stats: { maxHp: 10, startEnergy: 10 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_leather_bag',
        flagValue: true,
      },
      {
        type: 'reduce_damage_taken',
        value: 0.1,
      },
    ],
  },
  {
    id: 'detective_case_file',
    name: '未完的案件档案',
    icon: '📁',
    rarity: 'rare',
    category: 'story',
    description: '你正在追查的那桩失踪案的完整档案。档案里的线索与这个诡异的世界有着千丝万缕的联系。让你从村庄附近开始，提前揭开部分阴谋。',
    lore: '"最后一页写着一个地名——你现在就站在这个地方。这不可能是巧合..."',
    availableFor: ['detective'],
    effects: [
      {
        type: 'modify_start_position',
        position: { x: 3, y: 4 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_case_file',
        flagValue: true,
      },
      {
        type: 'set_start_flag',
        flag: 'know_missing_persons',
        flagValue: true,
      },
      {
        type: 'reveal_tiles',
        tileIds: ['village_1', 'village_2', 'forest_1'],
      },
      {
        type: 'bonus_start_reputation',
        factionId: 'monastery',
        reputation: 10,
      },
      {
        type: 'trigger_start_event',
        eventId: 'event_case_file_clue',
      },
      {
        type: 'bonus_start_items',
        items: [{ itemId: 'map_fragment', count: 2 }],
      },
    ],
  },

  // ============== 流亡神父遗物 ==============
  {
    id: 'priest_frayed_rosary',
    name: '磨损的玫瑰经念珠',
    icon: '📿',
    rarity: 'rare',
    category: 'ability',
    description: '你在被放逐时偷偷带走的念珠，每一颗珠子都承载着无数次祈祷。增强你的神圣力量，让你在对抗黑暗时更加从容。',
    lore: '"即使教会抛弃了你，你依然坚信，你的信仰不会抛弃你..."',
    availableFor: ['priest'],
    effects: [
      {
        type: 'bonus_start_items',
        items: [
          { itemId: 'holy_water', count: 2 },
          { itemId: 'blessed_bread', count: 2 },
          { itemId: 'candle', count: 3 },
        ],
      },
      {
        type: 'modify_base_stats',
        stats: { maxSanity: 10, startPollution: -5 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_frayed_rosary',
        flagValue: true,
      },
      {
        type: 'reduce_pollution_gain',
        value: 0.15,
      },
      {
        type: 'bonus_sanity_recovery',
        value: 3,
      },
    ],
  },
  {
    id: 'priest_broken_cross',
    name: '断裂的圣十字架',
    icon: '☦️',
    rarity: 'legendary',
    category: 'story',
    description: '你在接触那本禁书时，胸前的十字架当场断裂。这份"亵渎"让你被放逐，但十字架依然残存着某种神圣的力量。让你从神殿附近开始，揭开信仰背后的真相。',
    lore: '"它断了，但你能感觉到，它里面封印的力量从未消失——只是改变了形态..."',
    availableFor: ['priest'],
    effects: [
      {
        type: 'modify_start_position',
        position: { x: 5, y: 2 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_broken_cross',
        flagValue: true,
      },
      {
        type: 'set_start_flag',
        flag: 'witnessed_miracle',
        flagValue: true,
      },
      {
        type: 'reveal_tiles',
        tileIds: ['shrine_1', 'shrine_2', 'camp_0'],
      },
      {
        type: 'bonus_start_reputation',
        factionId: 'monastery',
        reputation: 20,
      },
      {
        type: 'trigger_start_event',
        eventId: 'event_broken_cross_whisper',
      },
      {
        type: 'bonus_sanity_recovery',
        value: 5,
      },
      {
        type: 'reduce_damage_taken',
        value: 0.15,
      },
    ],
  },

  // ============== 守林人遗物 ==============
  {
    id: 'hunter_wooden_whistle',
    name: '老猎人的木哨',
    icon: '🪵',
    rarity: 'common',
    category: 'resource',
    description: '你祖父传下来的木哨，据说能召唤林中的精灵。实际上，它能帮你更好地在野外生存，获取更多的自然资源。',
    lore: '"你祖父说过，当你迷失在山中时，吹响它——总会有回应的..."',
    availableFor: ['hunter'],
    effects: [
      {
        type: 'bonus_start_items',
        items: [
          { itemId: 'arrow', count: 8 },
          { itemId: 'dried_herb', count: 3 },
          { itemId: 'raw_meat', count: 2 },
          { itemId: 'flint', count: 2 },
        ],
      },
      {
        type: 'modify_base_stats',
        stats: { maxHp: 15, startHunger: 20 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_wooden_whistle',
        flagValue: true,
      },
      {
        type: 'reduce_hunger_rate',
        value: 0.2,
      },
      {
        type: 'increase_action_points',
        value: 1,
      },
    ],
  },
  {
    id: 'hunter_wolf_pelt_cloak',
    name: '白狼皮斗篷',
    icon: '🐺',
    rarity: 'rare',
    category: 'story',
    description: '你年轻时猎杀的那头传说中的白狼的皮毛制成的斗篷。从那以后，你总能感觉到它的灵魂在指引着你。让你从森林深处开始，与深潜者产生奇妙的联系。',
    lore: '"那晚下着大雪，那头白狼看着你的眼睛——你在它眼中看到了智慧，而非恐惧..."',
    availableFor: ['hunter'],
    effects: [
      {
        type: 'modify_start_position',
        position: { x: 2, y: 2 },
      },
      {
        type: 'set_start_flag',
        flag: 'relic_wolf_pelt_cloak',
        flagValue: true,
      },
      {
        type: 'set_start_flag',
        flag: 'wolf_spirit_guide',
        flagValue: true,
      },
      {
        type: 'reveal_tiles',
        tileIds: ['forest_1', 'forest_3', 'forest_4', 'lake_1'],
      },
      {
        type: 'bonus_start_reputation',
        factionId: 'deep_ones',
        reputation: 15,
      },
      {
        type: 'trigger_start_event',
        eventId: 'event_wolf_spirit_guide',
      },
      {
        type: 'scouting_range_bonus',
        value: 1,
      },
      {
        type: 'reduce_damage_taken',
        value: 0.1,
      },
    ],
  },
]

export function getRelicsForIdentity(identityId: string): Relic[] {
  return RELICS.filter(r => r.availableFor.includes(identityId))
}
