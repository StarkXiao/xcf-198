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
  {
    id: 'ending_holy_light',
    name: '圣火长明',
    type: 'good',
    description: '修道院认可了你的虔诚，圣火将为你指引回家的路。',
    epilogue: `
修道院的大门为你敞开。

你穿过漫长的回廊，来到圣殿的最深处。在那里，一团永不熄灭的圣火在祭坛上跳动。

"你证明了，即使在最黑暗的深渊边缘，人类的信仰也能照亮归途。"
大修道院长将手放在你的额头上，圣火的温暖流入你的全身。

你感到污染从身体中被驱逐，那些扭曲的幻象渐渐退去。
世界在你眼前变得清晰——那是你自己的世界，那个正常的世界。

你回到了家乡的教堂。
阳光透过彩色玻璃窗洒在你身上，温暖而安宁。
你再也没有听到那些低语，再也没有看到那些阴影。

但每当夜深人静，你会在胸前画一个十字——
为了纪念那个你选择光明而非深渊的夜晚。

圣火长明。信仰永存。

—— 结局：圣火长明 ——
    `.trim(),
    requirements: [
      { type: 'reputation_above', factionId: 'monastery', value: 85 },
      { type: 'sanity_above', value: 50 },
      { type: 'hp_above', value: 1 },
      { type: 'flag_set', flagKey: 'monastery_ally', flagValue: true },
    ],
  },
  {
    id: 'ending_deep_awakening',
    name: '深渊觉醒',
    type: 'neutral',
    description: '你接受了深渊的召唤，旧日的血脉在你体内觉醒。',
    epilogue: `
水面分开，你走了下去——不是在水面之上，而是在水面之下。

你的皮肤上浮现出细密的鳞片，手指间长出了半透明的蹼。
你不再需要呼吸空气，深海的黑暗是你的归宿。

那些曾经令你恐惧的低语，现在只是亲人的问候。
那些曾经让你疯狂的幻象，现在只是日常的风景。

你潜入湖底，潜入海底，潜入比海更深的地方。
在那里，巨大的阴影在沉睡中缓缓呼吸。

"你回来了。"它们说。
"我一直都在这里。"你回答。

你不再是人类了。
但你不觉得遗憾——因为你知道，真正的你从未属于那个地面上的世界。

Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn.

—— 结局：深渊觉醒 ——
    `.trim(),
    requirements: [
      { type: 'reputation_above', factionId: 'deep_ones', value: 85 },
      { type: 'pollution_above', value: 60 },
      { type: 'flag_set', flagKey: 'deep_ones_ally', flagValue: true },
    ],
  },
  {
    id: 'ending_balance',
    name: '天平之衡',
    type: 'secret',
    description: '你维持了各方势力的平衡，成为了守望者的领袖。',
    epilogue: `
你站在世界的交汇点上。
光明与深渊，信仰与知识，人类与旧日——这些力量在你身上达成了平衡。

守望者的面具落在你手中。
"天平已经选中了它的守护者。"

你戴上面具，世界在你眼中展现出了从未有过的全貌。
你看到了修道院的圣火，也看到了深渊的暗流。
你看到了人类挣扎求存的身影，也看到了旧日支配者沉睡的躯体。

你不会偏袒任何一方。
你只是注视，记录，在必要的时候——轻轻拨动天平。

这个世界需要一个见证者。
需要一个站在光明与黑暗之间的人。

从今天起，你就是那只永远睁开的眼睛。

—— 隐藏结局：天平之衡 ——
    `.trim(),
    requirements: [
      { type: 'reputation_above', factionId: 'watchers', value: 70 },
      { type: 'reputation_below', factionId: 'monastery', value: 30 },
      { type: 'reputation_above', factionId: 'monastery', value: -20 },
      { type: 'reputation_below', factionId: 'deep_ones', value: 30 },
      { type: 'reputation_above', factionId: 'deep_ones', value: -20 },
      { type: 'flag_set', flagKey: 'watchers_ally', flagValue: true },
      { type: 'sanity_above', value: 30 },
      { type: 'hp_above', value: 1 },
    ],
  },
]

export function getEndingById(id: string): Ending | undefined {
  return ENDINGS.find(e => e.id === id)
}
