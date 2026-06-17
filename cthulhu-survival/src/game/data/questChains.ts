import type { QuestChain } from '../types/events'

export const QUEST_CHAINS: QuestChain[] = [
  {
    id: 'quest_monastery_light',
    name: '圣光之路',
    description: '修道院的圣光在召唤你。通过一系列试炼，证明你的虔诚与勇气，成为圣光的守护者。',
    faction: 'monastery',
    priority: 10,
    startConditions: [
      { type: 'reputation_above', factionId: 'monastery', value: 15 },
    ],
    completionConditions: [
      { type: 'quest_step_reached', questId: 'quest_monastery_light', stepId: 'step_monastery_final' },
    ],
    failureConditions: [
      { type: 'reputation_below', factionId: 'monastery', value: 0 },
    ],
    isRepeatable: false,
    steps: [
      {
        id: 'step_monastery_intro',
        title: '圣光的召唤',
        description: '你感受到了修道院的召唤，他们似乎在寻找能够继承圣光意志的人。',
        stepIndex: 0,
        conditions: [
          { type: 'reputation_above', factionId: 'monastery', value: 15 },
        ],
        eventTriggers: ['event_monastery_encounter'],
        rewards: [
          { type: 'reputation', factionId: 'monastery', value: 5 },
        ],
        nextStepOnSuccess: 'step_monastery_trial1',
        nextStepOnFailure: 'step_monastery_intro',
      },
      {
        id: 'step_monastery_trial1',
        title: '净化试炼',
        description: '修道士要求你证明自己的决心。你需要在污染之地保持本心。',
        stepIndex: 1,
        conditions: [
          { type: 'event_triggered', eventId: 'event_monastery_encounter' },
          { type: 'has_flag', flagKey: 'monastery_ally', flagValue: true },
        ],
        eventTriggers: ['event_shrine'],
        rewards: [
          { type: 'item', itemId: 'holy_water', count: 1 },
          { type: 'reputation', factionId: 'monastery', value: 10 },
        ],
        failureRewards: [
          { type: 'reputation', factionId: 'monastery', value: -5 },
        ],
        nextStepOnSuccess: 'step_monastery_trial2',
        nextStepOnFailure: 'step_monastery_trial1',
      },
      {
        id: 'step_monastery_trial2',
        title: '勇气试炼',
        description: '深入废弃村庄，驱散那里的黑暗存在。这是对你勇气的考验。',
        stepIndex: 2,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_monastery_light', stepId: 'step_monastery_trial1' },
          { type: 'has_flag', flagKey: 'found_church', flagValue: true },
        ],
        eventTriggers: ['event_abandoned_village'],
        rewards: [
          { type: 'item', itemId: 'purification_charm', count: 1 },
          { type: 'reputation', factionId: 'monastery', value: 15 },
        ],
        failureRewards: [
          { type: 'sanity', value: -10 },
          { type: 'reputation', factionId: 'monastery', value: -3 },
        ],
        nextStepOnSuccess: 'step_monastery_trial3',
        nextStepOnFailure: 'step_monastery_trial2',
      },
      {
        id: 'step_monastery_trial3',
        title: '意志试炼',
        description: '在低语林中抗拒诱惑，证明你的意志坚不可摧。',
        stepIndex: 3,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_monastery_light', stepId: 'step_monastery_trial2' },
        ],
        eventTriggers: ['event_whisper_woods'],
        rewards: [
          { type: 'sanity', value: 20 },
          { type: 'reputation', factionId: 'monastery', value: 10 },
        ],
        failureRewards: [
          { type: 'sanity', value: -15 },
        ],
        nextStepOnSuccess: 'step_monastery_final',
        nextStepOnFailure: 'step_monastery_trial3',
        isKeyDecision: true,
      },
      {
        id: 'step_monastery_final',
        title: '圣光继承者',
        description: '你通过了所有试炼，修道院承认了你的资格。你成为了圣光在世间的代行者。',
        stepIndex: 4,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_monastery_light', stepId: 'step_monastery_trial3' },
          { type: 'reputation_above', factionId: 'monastery', value: 40 },
        ],
        rewards: [
          { type: 'item', itemId: 'monastery_seal', count: 1 },
          { type: 'flag', flagKey: 'monastery_champion', flagValue: true },
          { type: 'reputation', factionId: 'monastery', value: 20 },
          { type: 'recipe', recipeId: 'purification' },
          { type: 'ending', endingId: 'ending_light' },
        ],
        isKeyDecision: true,
      },
    ],
    rewards: [
      { type: 'item', itemId: 'holy_water', count: 3 },
      { type: 'flag', flagKey: 'quest_monastery_complete', flagValue: true },
      { type: 'ending', endingId: 'ending_salvation' },
    ],
    unlocks: [
      { type: 'ending', endingId: 'ending_salvation' },
      { type: 'recipe', recipeId: 'purification' },
    ],
  },
  {
    id: 'quest_abyss_call',
    name: '深渊的呼唤',
    description: '深海的低语在你耳边回荡。深潜者们似乎在等待着什么...而你，或许就是关键。',
    faction: 'deep_ones',
    priority: 10,
    startConditions: [
      { type: 'reputation_above', factionId: 'deep_ones', value: 15 },
    ],
    completionConditions: [
      { type: 'quest_step_reached', questId: 'quest_abyss_call', stepId: 'step_abyss_final' },
    ],
    failureConditions: [
      { type: 'reputation_below', factionId: 'deep_ones', value: 0 },
    ],
    isRepeatable: false,
    steps: [
      {
        id: 'step_abyss_intro',
        title: '水面之下',
        description: '你第一次感受到了来自深渊的召唤。那不是恐惧，而是某种奇异的亲切感。',
        stepIndex: 0,
        conditions: [
          { type: 'reputation_above', factionId: 'deep_ones', value: 15 },
        ],
        eventTriggers: ['event_deep_ones_summon', 'event_dark_lake'],
        rewards: [
          { type: 'reputation', factionId: 'deep_ones', value: 5 },
        ],
        nextStepOnSuccess: 'step_abyss_trial1',
        nextStepOnFailure: 'step_abyss_intro',
      },
      {
        id: 'step_abyss_trial1',
        title: '倾听低语',
        description: '在幽黑湖泊边，试着聆听来自深渊的声音。',
        stepIndex: 1,
        conditions: [
          { type: 'event_triggered', eventId: 'event_deep_ones_summon' },
          { type: 'has_flag', flagKey: 'deep_ones_ally', flagValue: true },
        ],
        eventTriggers: ['event_dark_lake'],
        rewards: [
          { type: 'item', itemId: 'abyssal_pearl', count: 1 },
          { type: 'reputation', factionId: 'deep_ones', value: 10 },
        ],
        failureRewards: [
          { type: 'reputation', factionId: 'deep_ones', value: -5 },
        ],
        nextStepOnSuccess: 'step_abyss_trial2',
        nextStepOnFailure: 'step_abyss_trial1',
      },
      {
        id: 'step_abyss_trial2',
        title: '符文之智',
        description: '解读古老的符文，理解深渊的语言。这是知识的考验。',
        stepIndex: 2,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_abyss_call', stepId: 'step_abyss_trial1' },
        ],
        eventTriggers: ['event_ancient_ruins'],
        rewards: [
          { type: 'item', itemId: 'ancient_rune', count: 3 },
          { type: 'reputation', factionId: 'deep_ones', value: 15 },
        ],
        failureRewards: [
          { type: 'sanity', value: -10 },
        ],
        nextStepOnSuccess: 'step_abyss_trial3',
        nextStepOnFailure: 'step_abyss_trial2',
      },
      {
        id: 'step_abyss_trial3',
        title: '沉没神殿',
        description: '踏入沉没神殿，直面深渊的真相。这是对你决心的最终考验。',
        stepIndex: 3,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_abyss_call', stepId: 'step_abyss_trial2' },
          { type: 'has_flag', flagKey: 'unlock_eldritch_key', flagValue: true },
        ],
        eventTriggers: ['event_sunken_temple'],
        rewards: [
          { type: 'pollution', value: 20 },
          { type: 'reputation', factionId: 'deep_ones', value: 20 },
        ],
        failureRewards: [
          { type: 'hp', value: -20 },
          { type: 'sanity', value: -15 },
        ],
        nextStepOnSuccess: 'step_abyss_final',
        nextStepOnFailure: 'step_abyss_trial3',
        isKeyDecision: true,
      },
      {
        id: 'step_abyss_final',
        title: '深渊之子',
        description: '你已获得深渊的认可。从今往后，你将成为两个世界之间的桥梁。',
        stepIndex: 4,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_abyss_call', stepId: 'step_abyss_trial3' },
          { type: 'reputation_above', factionId: 'deep_ones', value: 50 },
        ],
        rewards: [
          { type: 'item', itemId: 'abyssal_pearl', count: 2 },
          { type: 'flag', flagKey: 'deep_ones_champion', flagValue: true },
          { type: 'recipe', recipeId: 'deep_ritual' },
          { type: 'reputation', factionId: 'deep_ones', value: 25 },
        ],
        isKeyDecision: true,
      },
    ],
    rewards: [
      { type: 'item', itemId: 'ancient_rune', count: 5 },
      { type: 'flag', flagKey: 'quest_abyss_complete', flagValue: true },
      { type: 'ending', endingId: 'ending_abyss' },
    ],
    unlocks: [
      { type: 'ending', endingId: 'ending_abyss' },
      { type: 'recipe', recipeId: 'deep_ritual' },
    ],
  },
  {
    id: 'quest_watchers_path',
    name: '守望者之路',
    description: '守望者一直在观察你。他们认为你具备独特的平衡感，邀请你加入他们的行列。',
    faction: 'watchers',
    priority: 8,
    startConditions: [
      { type: 'reputation_above', factionId: 'watchers', value: 10 },
      { type: 'day_above', value: 3 },
    ],
    completionConditions: [
      { type: 'quest_step_reached', questId: 'quest_watchers_path', stepId: 'step_watchers_final' },
    ],
    isRepeatable: false,
    steps: [
      {
        id: 'step_watchers_intro',
        title: '暗处的眼睛',
        description: '你感觉有人在注视着你，但每次回头都空无一人。守望者正在评估你。',
        stepIndex: 0,
        conditions: [
          { type: 'reputation_above', factionId: 'watchers', value: 10 },
        ],
        eventTriggers: ['event_watchers_meeting'],
        rewards: [
          { type: 'reputation', factionId: 'watchers', value: 5 },
        ],
        nextStepOnSuccess: 'step_watchers_trial1',
        nextStepOnFailure: 'step_watchers_intro',
      },
      {
        id: 'step_watchers_trial1',
        title: '洞察之眼',
        description: '使用观察者透镜，看清世界的真相。这是对你洞察力的考验。',
        stepIndex: 1,
        conditions: [
          { type: 'event_triggered', eventId: 'event_watchers_meeting' },
          { type: 'has_flag', flagKey: 'watchers_ally', flagValue: true },
        ],
        eventTriggers: ['event_crystal_cave'],
        rewards: [
          { type: 'item', itemId: 'observer_lens', count: 1 },
          { type: 'reputation', factionId: 'watchers', value: 10 },
          { type: 'energy', value: 20 },
        ],
        failureRewards: [
          { type: 'reputation', factionId: 'watchers', value: -5 },
        ],
        nextStepOnSuccess: 'step_watchers_trial2',
        nextStepOnFailure: 'step_watchers_trial1',
      },
      {
        id: 'step_watchers_trial2',
        title: '平衡之道',
        description: '在光明与黑暗之间找到平衡。守望者相信，真正的智慧来自于不偏不倚。',
        stepIndex: 2,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_watchers_path', stepId: 'step_watchers_trial1' },
        ],
        eventTriggers: ['event_altar'],
        rewards: [
          { type: 'sanity', value: 15 },
          { type: 'reputation', factionId: 'watchers', value: 15 },
        ],
        failureRewards: [
          { type: 'sanity', value: -10 },
        ],
        nextStepOnSuccess: 'step_watchers_trial3',
        nextStepOnFailure: 'step_watchers_trial2',
      },
      {
        id: 'step_watchers_trial3',
        title: '见证者',
        description: '深入幽深洞穴，见证那些不该存在的事物。守望者需要的是见证者，而非参与者。',
        stepIndex: 3,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_watchers_path', stepId: 'step_watchers_trial2' },
        ],
        eventTriggers: ['event_deep_cave'],
        rewards: [
          { type: 'item', itemId: 'ancient_rune', count: 2 },
          { type: 'reputation', factionId: 'watchers', value: 15 },
        ],
        failureRewards: [
          { type: 'hp', value: -15 },
        ],
        nextStepOnSuccess: 'step_watchers_final',
        nextStepOnFailure: 'step_watchers_trial3',
        isKeyDecision: true,
      },
      {
        id: 'step_watchers_final',
        title: '永恒的见证',
        description: '你已证明自己配得上守望者的身份。从今往后，你将以旁观者的视角，记录这个世界的终末。',
        stepIndex: 4,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_watchers_path', stepId: 'step_watchers_trial3' },
          { type: 'reputation_above', factionId: 'watchers', value: 45 },
        ],
        rewards: [
          { type: 'item', itemId: 'observer_lens', count: 1 },
          { type: 'flag', flagKey: 'watchers_champion', flagValue: true },
          { type: 'recipe', recipeId: 'observer_craft' },
          { type: 'reputation', factionId: 'watchers', value: 20 },
          { type: 'sanity', value: 30 },
        ],
        isKeyDecision: true,
      },
    ],
    rewards: [
      { type: 'item', itemId: 'ancient_rune', count: 3 },
      { type: 'flag', flagKey: 'quest_watchers_complete', flagValue: true },
      { type: 'ending', endingId: 'ending_witness' },
    ],
    unlocks: [
      { type: 'ending', endingId: 'ending_witness' },
      { type: 'recipe', recipeId: 'observer_craft' },
    ],
  },
  {
    id: 'quest_survival_basics',
    name: '生存基础',
    description: '在这片诡异的土地上活下去。收集资源，建立营地，探索未知。',
    priority: 5,
    startConditions: [
      { type: 'day_above', value: 1 },
    ],
    completionConditions: [
      { type: 'quest_step_reached', questId: 'quest_survival_basics', stepId: 'step_survive_3days' },
    ],
    isRepeatable: false,
    steps: [
      {
        id: 'step_gather_wood',
        title: '收集木材',
        description: '木材是最基础的生存资源。在森林中收集足够的木材。',
        stepIndex: 0,
        conditions: [
          { type: 'day_above', value: 1 },
        ],
        eventTriggers: ['event_forest_explore'],
        rewards: [
          { type: 'energy', value: 10 },
        ],
        nextStepOnSuccess: 'step_find_water',
        nextStepOnFailure: 'step_gather_wood',
      },
      {
        id: 'step_find_water',
        title: '寻找水源',
        description: '找到可靠的水源，这是生存的关键。',
        stepIndex: 1,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_survival_basics', stepId: 'step_gather_wood' },
        ],
        eventTriggers: ['event_quiet_pond'],
        rewards: [
          { type: 'hunger', value: 20 },
          { type: 'sanity', value: 5 },
        ],
        nextStepOnSuccess: 'step_establish_camp',
        nextStepOnFailure: 'step_find_water',
      },
      {
        id: 'step_establish_camp',
        title: '建立营地',
        description: '找到一个安全的地方，建立你的临时营地。',
        stepIndex: 2,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_survival_basics', stepId: 'step_find_water' },
          { type: 'has_item', itemId: 'wood', value: 3 },
        ],
        eventTriggers: ['event_camp_rest'],
        rewards: [
          { type: 'sanity', value: 15 },
        ],
        nextStepOnSuccess: 'step_survive_3days',
        nextStepOnFailure: 'step_establish_camp',
      },
      {
        id: 'step_survive_3days',
        title: '最初的三天',
        description: '成功在这片诡异的土地上存活三天。你已经掌握了基本的生存技能。',
        stepIndex: 3,
        conditions: [
          { type: 'day_above', value: 3 },
          { type: 'quest_step_reached', questId: 'quest_survival_basics', stepId: 'step_establish_camp' },
        ],
        rewards: [
          { type: 'item', itemId: 'rope', count: 1 },
          { type: 'item', itemId: 'dried_herb', count: 2 },
          { type: 'energy', value: 30 },
          { type: 'flag', flagKey: 'survival_basics_done', flagValue: true },
        ],
      },
    ],
    rewards: [
      { type: 'item', itemId: 'torch', count: 2 },
      { type: 'flag', flagKey: 'quest_survival_complete', flagValue: true },
    ],
    unlocks: [],
  },
  {
    id: 'quest_forbidden_knowledge',
    name: '禁忌知识',
    description: '某些知识不应被凡人触及...但好奇心总是驱使着我们向前。',
    priority: 7,
    startConditions: [
      { type: 'has_flag', flagKey: 'entered_sunken_temple', flagValue: true },
    ],
    completionConditions: [
      { type: 'quest_step_reached', questId: 'quest_forbidden_knowledge', stepId: 'step_truth' },
    ],
    failureConditions: [
      { type: 'sanity_below', value: 10 },
    ],
    isRepeatable: false,
    steps: [
      {
        id: 'step_first_sight',
        title: '惊鸿一瞥',
        description: '你瞥见了真相的一角，但那只是冰山一角。更多的秘密等待被发现。',
        stepIndex: 0,
        conditions: [
          { type: 'has_flag', flagKey: 'entered_sunken_temple', flagValue: true },
        ],
        eventTriggers: ['event_ancient_ruins', 'event_sunken_temple'],
        rewards: [
          { type: 'item', itemId: 'ancient_rune', count: 2 },
          { type: 'pollution', value: 10 },
        ],
        nextStepOnSuccess: 'step_deeper',
        nextStepOnFailure: 'step_first_sight',
      },
      {
        id: 'step_deeper',
        title: '深入调查',
        description: '更多的遗迹、更多的符文、更多的真相...也更多的疯狂。',
        stepIndex: 1,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_forbidden_knowledge', stepId: 'step_first_sight' },
          { type: 'has_flag', flagKey: 'deciphered_runes', flagValue: true },
        ],
        eventTriggers: ['event_whisper_woods', 'event_deep_cave'],
        rewards: [
          { type: 'item', itemId: 'sanity_potion', count: 1 },
          { type: 'recipe', recipeId: 'alchemy' },
        ],
        failureRewards: [
          { type: 'sanity', value: -20 },
        ],
        nextStepOnSuccess: 'step_truth',
        nextStepOnFailure: 'step_deeper',
        isKeyDecision: true,
      },
      {
        id: 'step_truth',
        title: '真相的代价',
        description: '你终于理解了一切...但理解的代价是什么？',
        stepIndex: 2,
        conditions: [
          { type: 'quest_step_reached', questId: 'quest_forbidden_knowledge', stepId: 'step_deeper' },
          { type: 'pollution_above', value: 50 },
        ],
        rewards: [
          { type: 'flag', flagKey: 'forbidden_truth', flagValue: true },
          { type: 'item', itemId: 'ancient_rune', count: 5 },
          { type: 'ending', endingId: 'ending_truth' },
        ],
        isKeyDecision: true,
      },
    ],
    rewards: [
      { type: 'item', itemId: 'ancient_rune', count: 3 },
      { type: 'flag', flagKey: 'quest_forbidden_complete', flagValue: true },
      { type: 'ending', endingId: 'ending_cosmic' },
    ],
    unlocks: [
      { type: 'ending', endingId: 'ending_cosmic' },
      { type: 'recipe', recipeId: 'alchemy' },
    ],
  },
]

export function getQuestChainById(id: string): QuestChain | undefined {
  return QUEST_CHAINS.find(q => q.id === id)
}

export function getQuestStepById(questId: string, stepId: string) {
  const quest = getQuestChainById(questId)
  if (!quest) return undefined
  return quest.steps.find(s => s.id === stepId)
}
