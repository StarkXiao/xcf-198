import type { Merchant, MerchantId } from '../types/merchant'

export const MERCHANTS: Merchant[] = [
  {
    id: 'merchant_wanderer',
    name: '流浪商人',
    title: '行踪不定的行商',
    icon: '🎒',
    description: '一位背着大包的行商，脸上带着神秘的微笑。他说自己来自远方，贩卖各种来路不明的物资。',
    category: 'wanderer',
    factionPreference: 'neutral',
    preferredTiles: ['forest_1', 'forest_2', 'forest_3', 'forest_4', 'village_1'],
    encounterChance: 0.25,
    nightBonusChance: 0.15,
    minDayAppear: 1,
    minDangerLevel: 0,
    welcomeText: '"哦？又一位迷途的旅人。我这里有些好东西...保证你在别处买不到。"',
    departureText: '"祝你好运，旅人。我们还会再见面的...在某个更加黑暗的角落。"',
    refuseDealText: '"哼，不识货的人就趁早离开吧。"',
    inventory: [
      {
        itemId: 'sanity_potion',
        basePrice: { goldCoin: 3, strangeStone: 2 },
        category: 'contraband',
        stock: 2,
        maxStock: 2,
      },
      {
        itemId: 'medicinal_herb',
        basePrice: { goldCoin: 2 },
        category: 'contraband',
        stock: 3,
        maxStock: 3,
      },
      {
        itemId: 'torch',
        basePrice: { goldCoin: 1 },
        category: 'contraband',
        stock: 3,
        maxStock: 5,
      },
      {
        itemId: 'map_fragment',
        basePrice: { goldCoin: 5, barterItems: [{ itemId: 'dried_herb', count: 3 }] },
        category: 'intel',
        stock: 1,
        maxStock: 2,
        triggersEventOnBuy: 'event_merchant_wanderer_map',
      },
      {
        itemId: 'old_book',
        basePrice: { goldCoin: 8, ancientRune: 1 },
        category: 'rare_material',
        stock: 1,
        maxStock: 1,
        triggersEventOnBuy: 'event_merchant_wanderer_book',
      },
      {
        itemId: 'gold_coin',
        basePrice: { barterItems: [{ itemId: 'dried_herb', count: 5 }, { itemId: 'wood', count: 10 }] },
        category: 'contraband',
        stock: 3,
        maxStock: 5,
      },
    ],
    specialDialogue: [
      {
        flagKey: 'merchant_wanderer_friend',
        text: '"哦，是你！老朋友，今天我给你准备了特别的好货。"',
      },
    ],
  },
  {
    id: 'merchant_abyssal',
    name: '深渊交易者',
    title: '披着黑袍的密使',
    icon: '🐙',
    description: '一个全身包裹在黑色长袍中的神秘人，只能看到他袍子下露出的...鳞片？他似乎对你很感兴趣。',
    category: 'abyssal',
    factionPreference: 'deep_ones',
    preferredTiles: ['lake_1', 'lake_2', 'cave_1', 'cave_2', 'shrine_2', 'ruins_2'],
    encounterChance: 0.2,
    nightBonusChance: 0.3,
    minDayAppear: 3,
    minDangerLevel: 1,
    welcomeText: '"凡人...你能感知到深渊的召唤吗？吾带来了深海的礼物，只要你付出相应的代价。"',
    departureText: '"Ph\'nglui mglw\'nafh Cthulhu R\'lyeh...你听懂了，不是吗？"',
    refuseDealText: '"无知的凡人...当深渊吞噬你的时候，不要后悔今日的选择。"',
    inventory: [
      {
        itemId: 'deep_scale',
        basePrice: { goldCoin: 10, strangeStone: 5 },
        category: 'rare_material',
        stock: 2,
        maxStock: 3,
      },
      {
        itemId: 'abyss_elixir',
        basePrice: { abyssPearl: 1, barterItems: [{ itemId: 'deep_scale', count: 3 }] },
        category: 'contraband',
        stock: 2,
        maxStock: 2,
        minReputation: { factionId: 'deep_ones', value: 20 },
      },
      {
        itemId: 'tainted_charm',
        basePrice: { abyssPearl: 1, ancientRune: 2 },
        category: 'contraband',
        stock: 1,
        maxStock: 2,
        minReputation: { factionId: 'deep_ones', value: 30 },
      },
      {
        itemId: 'abyssal_tentacle',
        basePrice: { barterItems: [{ itemId: 'deep_scale', count: 5 }] },
        category: 'rare_material',
        stock: 1,
        maxStock: 2,
      },
      {
        itemId: 'intel_abyss_gate',
        basePrice: { abyssPearl: 2, ancientRune: 3, barterItems: [{ itemId: 'deep_scale', count: 5 }] },
        category: 'intel',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'deep_ones', value: 40 },
        triggersEventOnBuy: 'event_merchant_abyssal_intel',
      },
      {
        itemId: 'abyss_core',
        basePrice: { abyssPearl: 3, ancientRune: 5, barterItems: [{ itemId: 'deep_scale', count: 10 }] },
        category: 'rare_material',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'deep_ones', value: 60 },
        requiredFlag: 'deep_ones_ally',
        triggersEventOnBuy: 'event_merchant_abyssal_core',
      },
      {
        itemId: 'phantom_cloak',
        basePrice: { abyssPearl: 2, barterItems: [{ itemId: 'deep_scale', count: 8 }] },
        category: 'contraband',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'deep_ones', value: 50 },
      },
      {
        itemId: 'void_essence',
        basePrice: { abyssPearl: 4, ancientRune: 8 },
        category: 'rare_material',
        stock: 1,
        maxStock: 2,
        minReputation: { factionId: 'deep_ones', value: 70 },
      },
    ],
    specialDialogue: [
      {
        flagKey: 'abyssal_heritage',
        text: '"深渊的子嗣...吾感受到了你体内的血脉。今日，吾以族人之礼相待。"',
      },
    ],
  },
  {
    id: 'merchant_monastery',
    name: '修道院密使',
    title: '白袍商人',
    icon: '⛪',
    description: '一位身穿白色修道袍的温和老者，但他眼中闪烁的光芒告诉你，他并非普通的修道士。',
    category: 'monastery',
    factionPreference: 'monastery',
    preferredTiles: ['shrine_1', 'village_1', 'lake_2', 'ruins_1', 'forest_3'],
    encounterChance: 0.2,
    nightBonusChance: 0.1,
    minDayAppear: 3,
    minDangerLevel: 1,
    welcomeText: '"愿圣光与你同在，孩子。我奉修道院之命，在此地为迷途者提供指引...和一些必要的物资。"',
    departureText: '"愿圣火照亮你的道路。当黑暗降临之时，记住，你并不孤单。"',
    refuseDealText: '"信仰需要时间。当你准备好了，修道院的大门永远为虔诚者敞开。"',
    inventory: [
      {
        itemId: 'monastery_medal',
        basePrice: { goldCoin: 8, barterItems: [{ itemId: 'holy_water', count: 1 }] },
        category: 'rare_material',
        stock: 2,
        maxStock: 3,
      },
      {
        itemId: 'holy_cleanser',
        basePrice: { monasterySeal: 1, barterItems: [{ itemId: 'monastery_medal', count: 2 }] },
        category: 'contraband',
        stock: 1,
        maxStock: 2,
        minReputation: { factionId: 'monastery', value: 25 },
      },
      {
        itemId: 'purification_charm',
        basePrice: { barterItems: [{ itemId: 'monastery_medal', count: 1 }, { itemId: 'dried_herb', count: 5 }] },
        category: 'contraband',
        stock: 2,
        maxStock: 3,
      },
      {
        itemId: 'blessed_bread',
        basePrice: { goldCoin: 2 },
        category: 'contraband',
        stock: 4,
        maxStock: 6,
      },
      {
        itemId: 'holy_fragment',
        basePrice: { monasterySeal: 2, ancientRune: 3, barterItems: [{ itemId: 'monastery_medal', count: 5 }] },
        category: 'rare_material',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'monastery', value: 45 },
        triggersEventOnBuy: 'event_merchant_monastery_fragment',
      },
      {
        itemId: 'intel_monastery_secret',
        basePrice: { monasterySeal: 1, barterItems: [{ itemId: 'monastery_medal', count: 3 }] },
        category: 'intel',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'monastery', value: 40 },
        triggersEventOnBuy: 'event_merchant_monastery_secret',
      },
      {
        itemId: 'cursed_blade',
        basePrice: { barterItems: [{ itemId: 'monastery_medal', count: 4 }, { itemId: 'holy_water', count: 2 }] },
        category: 'contraband',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'monastery', value: 55 },
        description: '一把被修道院净化过的诅咒之刃，破坏力依旧但副作用已被封印。',
      },
      {
        itemId: 'forbidden_serum',
        basePrice: { barterItems: [{ itemId: 'holy_fragment', count: 1 }, { itemId: 'monastery_medal', count: 8 }] },
        category: 'contraband',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'monastery', value: 70 },
        requiredFlag: 'monastery_ally',
        description: '修道院的禁忌产物，只有在最危急的时刻才被允许使用。',
      },
    ],
    specialDialogue: [
      {
        flagKey: 'monastery_ally',
        text: '"啊，是你！圣殿守卫，修道院以你为荣。今日的物资，我给你特别的优待。"',
      },
    ],
  },
  {
    id: 'merchant_watcher',
    name: '守望者线人',
    title: '情报贩子',
    icon: '👁️',
    description: '一个戴着单片眼镜的神秘学者，他似乎对你的一举一动都了如指掌。',
    category: 'watcher',
    factionPreference: 'watchers',
    preferredTiles: ['ruins_1', 'cave_1', 'forest_3', 'cave_2', 'shrine_2'],
    encounterChance: 0.18,
    nightBonusChance: 0.22,
    minDayAppear: 4,
    minDangerLevel: 2,
    welcomeText: '"我观察你很久了。你的选择有趣极了...作为守望者的一员，我可以告诉你一些真相。但真相，从来都不便宜。"',
    departureText: '"继续做出你的选择吧。天平会记录一切。下一次，或许我会告诉你更多。"',
    refuseDealText: '"无知有时也是一种幸福。但你选择了这条路，迟早会回来找我的。"',
    inventory: [
      {
        itemId: 'observer_scroll',
        basePrice: { goldCoin: 10, ancientRune: 2 },
        category: 'rare_material',
        stock: 2,
        maxStock: 3,
      },
      {
        itemId: 'observer_lens',
        basePrice: { observerCrystal: 2, barterItems: [{ itemId: 'observer_scroll', count: 3 }] },
        category: 'rare_material',
        stock: 1,
        maxStock: 2,
        minReputation: { factionId: 'watchers', value: 25 },
      },
      {
        itemId: 'observer_crystal',
        basePrice: { barterItems: [{ itemId: 'observer_scroll', count: 2 }, { itemId: 'map_fragment', count: 3 }] },
        category: 'rare_material',
        stock: 2,
        maxStock: 3,
      },
      {
        itemId: 'divination_rod',
        basePrice: { barterItems: [{ itemId: 'observer_scroll', count: 2 }], ancientRune: 3 },
        category: 'contraband',
        stock: 1,
        maxStock: 2,
      },
      {
        itemId: 'intel_watcher_archive',
        basePrice: { observerCrystal: 2, ancientRune: 5, barterItems: [{ itemId: 'observer_scroll', count: 5 }] },
        category: 'intel',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'watchers', value: 40 },
        triggersEventOnBuy: 'event_merchant_watcher_archive',
      },
      {
        itemId: 'intel_ritual_site',
        basePrice: { ancientRune: 8, barterItems: [{ itemId: 'observer_scroll', count: 8 }, { itemId: 'truth_shard', count: 2 }] },
        category: 'intel',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'watchers', value: 55 },
        requiredFlag: 'watchers_ally',
        triggersEventOnBuy: 'event_merchant_watcher_ritual',
      },
      {
        itemId: 'truth_shard',
        basePrice: { observerCrystal: 5, ancientRune: 10 },
        category: 'rare_material',
        stock: 1,
        maxStock: 2,
        minReputation: { factionId: 'watchers', value: 50 },
      },
      {
        itemId: 'intel_final_truth',
        basePrice: { ancientRune: 15, barterItems: [{ itemId: 'truth_shard', count: 3 }, { itemId: 'observer_scroll', count: 15 }] },
        category: 'intel',
        stock: 1,
        maxStock: 1,
        minReputation: { factionId: 'watchers', value: 75 },
        requiredFlag: 'unlock_final_truth',
        triggersEventOnBuy: 'event_merchant_watcher_final',
      },
    ],
    specialDialogue: [
      {
        flagKey: 'watchers_ally',
        text: '"守望之眼！没想到能在这里遇到你。档案馆里的情报，我全部开放给你。"',
      },
    ],
  },
  {
    id: 'merchant_legendary',
    name: '无名收藏家',
    title: '传说中的商人',
    icon: '🎭',
    description: '一个戴着华丽面具的身影，仿佛从虚空中走出来。他的存在本身就像是一种幻觉。你听说过关于他的传说——他拥有一切，却不贩卖任何凡物。',
    category: 'legendary',
    factionPreference: 'neutral',
    preferredTiles: ['shrine_2', 'ruins_2', 'cave_1', 'lake_1'],
    encounterChance: 0.08,
    nightBonusChance: 0.12,
    minDayAppear: 7,
    minDangerLevel: 3,
    welcomeText: '"咯咯咯...能遇到我，证明你的命运不凡。我贩卖的不是物品，而是可能性。告诉我，你愿意为你想要的，付出怎样的代价？"',
    departureText: '"命运的齿轮已经转动。无论你选择什么，结局都早已注定...或者不是？咯咯咯..."',
    refuseDealText: '"有趣的选择。但逃避命运，本身也是一种命运。"',
    inventory: [
      {
        itemId: 'eldritch_key',
        basePrice: {
          goldCoin: 50,
          ancientRune: 20,
          abyssPearl: 3,
          observerCrystal: 5,
        },
        category: 'rare_material',
        stock: 1,
        maxStock: 1,
        triggersEventOnBuy: 'event_merchant_legendary_key',
      },
      {
        itemId: 'eye_of_insight',
        basePrice: {
          ancientRune: 15,
          barterItems: [
            { itemId: 'truth_shard', count: 2 },
            { itemId: 'holy_fragment', count: 2 },
            { itemId: 'abyss_core', count: 1 },
          ],
        },
        category: 'rare_material',
        stock: 1,
        maxStock: 1,
        triggersEventOnBuy: 'event_merchant_legendary_eye',
      },
      {
        itemId: 'intel_final_truth',
        basePrice: {
          barterItems: [
            { itemId: 'truth_shard', count: 5 },
            { itemId: 'abyss_core', count: 3 },
            { itemId: 'holy_fragment', count: 3 },
            { itemId: 'void_essence', count: 2 },
          ],
        },
        category: 'intel',
        stock: 1,
        maxStock: 1,
        triggersEventOnBuy: 'event_merchant_legendary_truth',
      },
      {
        itemId: 'forbidden_serum',
        basePrice: {
          barterItems: [
            { itemId: 'abyss_core', count: 2 },
            { itemId: 'void_essence', count: 1 },
            { itemId: 'deep_scale', count: 20 },
          ],
        },
        category: 'contraband',
        stock: 2,
        maxStock: 2,
      },
      {
        itemId: 'abyss_core',
        basePrice: {
          goldCoin: 100,
          ancientRune: 25,
          barterItems: [{ itemId: 'deep_scale', count: 30 }],
        },
        category: 'rare_material',
        stock: 1,
        maxStock: 2,
      },
      {
        itemId: 'holy_fragment',
        basePrice: {
          goldCoin: 80,
          ancientRune: 15,
          barterItems: [{ itemId: 'monastery_medal', count: 20 }],
        },
        category: 'rare_material',
        stock: 1,
        maxStock: 2,
      },
      {
        itemId: 'truth_shard',
        basePrice: {
          goldCoin: 60,
          barterItems: [
            { itemId: 'observer_scroll', count: 20 },
            { itemId: 'map_fragment', count: 30 },
          ],
        },
        category: 'rare_material',
        stock: 1,
        maxStock: 3,
      },
      {
        itemId: 'void_essence',
        basePrice: {
          barterItems: [
            { itemId: 'abyss_core', count: 2 },
            { itemId: 'truth_shard', count: 2 },
            { itemId: 'holy_fragment', count: 2 },
          ],
        },
        category: 'rare_material',
        stock: 1,
        maxStock: 2,
      },
    ],
    specialDialogue: [
      {
        flagKey: 'legendary_merchant_return',
        text: '"咯咯咯...你果然回来了。我就知道，你是与众不同的那一个。这次，你想要什么？"',
      },
    ],
  },
]

export function getMerchantById(id: MerchantId): Merchant | undefined {
  return MERCHANTS.find(m => m.id === id)
}

export function getMerchantsForTile(tileId: string, day: number, dangerLevel: number, _isNight: boolean): Merchant[] {
  return MERCHANTS.filter(m => {
    if (!m.preferredTiles.includes(tileId)) return false
    if (day < m.minDayAppear) return false
    if (dangerLevel < m.minDangerLevel) return false
    return true
  })
}

export function rollMerchantEncounter(
  merchants: Merchant[],
  isNight: boolean,
  encounteredMerchants: Record<string, number> = {},
  _day: number,
): Merchant | null {
  if (merchants.length === 0) return null

  const weightedCandidates: { merchant: Merchant; weight: number }[] = []

  for (const merchant of merchants) {
    let chance = merchant.encounterChance
    if (isNight) chance += merchant.nightBonusChance

    const encounterCount = encounteredMerchants[merchant.id] || 0
    if (encounterCount > 0) {
      chance *= Math.pow(0.85, encounterCount)
    }

    if (merchant.category === 'legendary') {
      const legendaryEncounters = Object.entries(encounteredMerchants)
        .filter(([id]) => getMerchantById(id)?.category === 'legendary')
        .reduce((sum, [, count]) => sum + count, 0)
      if (legendaryEncounters > 0) {
        chance *= 0.3
      }
    }

    if (Math.random() < chance) {
      weightedCandidates.push({
        merchant,
        weight: 1 * (merchant.category === 'legendary' ? 0.5 : 1),
      })
    }
  }

  if (weightedCandidates.length === 0) return null

  const totalWeight = weightedCandidates.reduce((sum, c) => sum + c.weight, 0)
  let roll = Math.random() * totalWeight

  for (const candidate of weightedCandidates) {
    roll -= candidate.weight
    if (roll <= 0) return candidate.merchant
  }

  return weightedCandidates[weightedCandidates.length - 1].merchant
}
