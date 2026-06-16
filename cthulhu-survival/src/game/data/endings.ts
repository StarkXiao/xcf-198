import type { Ending } from '../types/events'

export const ENDINGS: Ending[] = [
  {
    id: 'ending_escape',
    name: '归途',
    type: 'good',
    description: '你找到了回归原本世界的方法。',
    epilogue: `
当你锻造出那把诡秘钥匙，将它插入虚空之中的裂缝时——
世界在你眼前崩塌、重组，那些扭曲的森林、幽黑的湖泊、无名的神社一一远去。

你睁开眼睛，发现自己躺在自己的房间里。阳光透过窗帘洒在地板上，一切看起来如此正常。

但你知道，有些东西已经永远改变了。
每当夜深人静，你仍能听到远处传来的低语。
每当闭上双眼，你仍能看到那座沉没神殿中的巨大阴影。

你回来了...但真的是"完整的你"吗？

—— 结局：归途 ——
    `.trim(),
    requirements: [
      { type: 'has_item', itemId: 'eldritch_key' },
      { type: 'sanity_above', value: 30 },
      { type: 'hp_above', value: 1 },
    ],
  },
  {
    id: 'ending_embrace',
    name: '拥抱深渊',
    type: 'neutral',
    description: '你选择留下，接受这个世界的真相。',
    epilogue: `
你放弃了寻找归途。
因为你终于明白——你从一开始就不属于那个"正常"的世界。

那些低语不再是恐惧的来源，而是亲切的呼唤。
那些扭曲的景象不再令人疯狂，而是前所未有的真实。

你走向森林深处，走向那座沉没的神殿。
在那里，有什么东西正在等待着你。
它伸出无数的触手，拥抱着你，欢迎你回家。

"Ph'nglui mglw'nafh..." 你默念着。
你终于，回到了真正的归宿。

—— 结局：拥抱深渊 ——
    `.trim(),
    requirements: [
      { type: 'pollution_above', value: 80 },
      { type: 'sanity_below', value: 40 },
      { type: 'flag_set', flagKey: 'entered_sunken_temple', flagValue: true },
    ],
  },
  {
    id: 'ending_survivor',
    name: '荒野余生',
    type: 'neutral',
    description: '你没有找到归途，但你在这个世界活了下来。',
    epilogue: `
七天过去了。
你没有找到回家的路，但你也没有死。

你学会了在这片扭曲的土地上生存。
你知道哪些草药可以食用，哪些地方可以安全过夜，哪些声音意味着危险将至。

你搭建了更坚固的营地，储存了足够的物资。
也许有一天你会找到归途，也许你会在这里度过余生。

但至少此刻——你还活着。
而在这个世界，活着本身就是最大的奇迹。

—— 结局：荒野余生 ——
    `.trim(),
    requirements: [
      { type: 'day_reach', value: 7 },
      { type: 'hp_above', value: 1 },
      { type: 'pollution_below', value: 80 },
    ],
  },
  {
    id: 'ending_madness',
    name: '坠入疯狂',
    type: 'bad',
    description: '你的理智彻底崩溃了。',
    epilogue: `
你不知道这是第几天了。
时间的概念早已消失。

你看到了太多不该看的东西。
那些符文、那些幻象、那些不可名状的存在——
它们刻在你的脑海里，挥之不去。

你开始笑了。
笑着笑着，你哭了。
哭着哭着，你又笑了。

在这片扭曲的森林中，一个身影徘徊着，
嘴里反复念叨着没人能听懂的话语。
他曾经是一个人...但现在，他只是又一个迷失在这片土地上的影子。

—— 结局：坠入疯狂 ——
    `.trim(),
    requirements: [
      { type: 'sanity_below', value: 1 },
    ],
  },
  {
    id: 'ending_death',
    name: '长眠于此',
    type: 'bad',
    description: '你没能在这片土地上活下来。',
    epilogue: `
你的身体终于撑不住了。
也许是伤痛，也许是饥饿，也许是污染——但这已经不重要了。

你倒在了冰冷的土地上，意识渐渐模糊。
在最后一刻，你似乎听到了什么声音。
是你的名字？还是那些低语？

你已经分辨不清了。
黑暗彻底吞没了你。

这片诡秘的土地，又多了一个不归的旅人。

—— 结局：长眠于此 ——
    `.trim(),
    requirements: [
      { type: 'hp_above', value: -100 },
    ],
  },
  {
    id: 'ending_truth',
    name: '窥见真相',
    type: 'secret',
    description: '你窥见了世界的真相，也付出了代价。',
    epilogue: `
你锻造了诡秘钥匙，也进入了沉没神殿的最深处。
在那里，你看到了一切——

宇宙的起源，时间的尽头，人类的渺小，以及那沉睡在拉莱耶的伟大存在。
你明白了这个世界的本质，也明白了自己的位置。

你选择用诡秘钥匙打开了那扇门。
不是为了回归，不是为了逃避，而是为了——见证。

门的另一边，无尽的星海在你眼前展开。
你迈出了那一步。

人类的故事结束了。
而你的故事，才刚刚开始。

—— 隐藏结局：窥见真相 ——
    `.trim(),
    requirements: [
      { type: 'has_item', itemId: 'eldritch_key' },
      { type: 'flag_set', flagKey: 'entered_sunken_temple', flagValue: true },
      { type: 'flag_set', flagKey: 'touched_altar', flagValue: true },
      { type: 'pollution_above', value: 50 },
      { type: 'pollution_below', value: 80 },
      { type: 'sanity_above', value: 40 },
    ],
  },
]

export function getEndingById(id: string): Ending | undefined {
  return ENDINGS.find(e => e.id === id)
}
