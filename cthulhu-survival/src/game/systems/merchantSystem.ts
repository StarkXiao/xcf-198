import type {
  Merchant,
  MerchantInventoryItem,
  MerchantPrice,
  MerchantTransactionResult,
  MerchantState,
  MerchantEncounterInfo,
} from '../types/merchant'
import type { InventoryItem } from '../types/items'
import type { ReputationMap, FactionId } from '../types/faction'
import { ITEMS } from '../data/items'
import { getMerchantsForTile, rollMerchantEncounter } from '../data/merchants'
import { addToInventory, removeFromInventory, getItemCount } from './craftSystem'
import { checkReputationRequirement } from './reputationSystem'

export interface AdjustedPrice {
  originalPrice: MerchantPrice
  adjustedPrice: MerchantPrice
  discountMultiplier: number
  reputationBonus: number
}

export interface AvailableItemResult {
  item: MerchantInventoryItem
  adjustedPrice: AdjustedPrice
  canAfford: boolean
  canBuy: boolean
  reason?: string
  currentStock: number
}

export interface MerchantInteractionResult {
  merchant: Merchant
  dialogue: string
  availableItems: AvailableItemResult[]
  encounterInfo: MerchantEncounterInfo
}

const PRICE_ITEM_ID_MAP: Partial<Record<keyof MerchantPrice, string>> = {
  goldCoin: 'gold_coin',
  strangeStone: 'strange_stone',
  ancientRune: 'ancient_rune',
  abyssPearl: 'abyssal_pearl',
  monasterySeal: 'monastery_seal',
  observerCrystal: 'observer_crystal',
}

export function createInitialMerchantState(): MerchantState {
  return {
    currentMerchant: null,
    encounterInfo: null,
    merchantStockOverrides: {},
    encounteredMerchants: {},
    successfulDeals: {},
  }
}

function getPriceItemId(key: keyof MerchantPrice): string {
  return PRICE_ITEM_ID_MAP[key] || key
}

export function calculateReputationDiscount(
  merchant: Merchant,
  reputation: ReputationMap,
): number {
  if (merchant.factionPreference === 'neutral') {
    return 1.0
  }

  const factionRep = reputation[merchant.factionPreference] || 0
  let multiplier = 1.0

  if (factionRep >= 85) multiplier = 0.65
  else if (factionRep >= 60) multiplier = 0.75
  else if (factionRep >= 30) multiplier = 0.85
  else if (factionRep >= 0) multiplier = 1.0
  else if (factionRep >= -30) multiplier = 1.15
  else multiplier = 1.35

  return multiplier
}

export function calculateSpecialFlagsDiscount(
  merchant: Merchant,
  flags: Record<string, boolean | number | string>,
): number {
  let multiplier = 1.0

  if (merchant.id === 'merchant_wanderer' && flags['merchant_wanderer_friend']) {
    multiplier *= 0.85
  }
  if (merchant.id === 'merchant_abyssal' && flags['abyssal_heritage']) {
    multiplier *= 0.7
  }
  if (merchant.id === 'merchant_monastery' && flags['monastery_ally']) {
    multiplier *= 0.8
  }
  if (merchant.id === 'merchant_watcher' && flags['watchers_ally']) {
    multiplier *= 0.8
  }
  if (merchant.id === 'merchant_legendary' && flags['legendary_merchant_return']) {
    multiplier *= 0.9
  }

  return multiplier
}

export function adjustPrice(
  basePrice: MerchantPrice,
  merchant: Merchant,
  reputation: ReputationMap,
  flags: Record<string, boolean | number | string>,
): AdjustedPrice {
  const reputationMultiplier = calculateReputationDiscount(merchant, reputation)
  const flagsMultiplier = calculateSpecialFlagsDiscount(merchant, flags)
  const discountMultiplier = reputationMultiplier * flagsMultiplier

  const adjustedPrice: MerchantPrice = {}

  for (const [key, value] of Object.entries(basePrice)) {
    const k = key as keyof MerchantPrice
    if (k === 'barterItems') continue
    if (typeof value === 'number') {
      const adjusted = Math.max(1, Math.ceil(value * discountMultiplier))
      ;(adjustedPrice as any)[k] = adjusted
    }
  }

  if (basePrice.barterItems) {
    adjustedPrice.barterItems = basePrice.barterItems.map(item => ({
      itemId: item.itemId,
      count: Math.max(1, Math.ceil(item.count * discountMultiplier)),
    }))
  }

  return {
    originalPrice: { ...basePrice },
    adjustedPrice,
    discountMultiplier,
    reputationBonus: 1 - reputationMultiplier,
  }
}

export function canAffordPrice(
  inventory: InventoryItem[],
  price: MerchantPrice,
): { canAfford: boolean; missing: string[] } {
  const missing: string[] = []

  for (const [key, value] of Object.entries(price)) {
    if (key === 'barterItems') continue
    if (typeof value === 'number' && value > 0) {
      const itemId = getPriceItemId(key as keyof MerchantPrice)
      const count = getItemCount(inventory, itemId)
      if (count < value) {
        const itemData = ITEMS[itemId]
        missing.push(`${itemData?.name || itemId} x${value - count}`)
      }
    }
  }

  if (price.barterItems) {
    for (const barter of price.barterItems) {
      const count = getItemCount(inventory, barter.itemId)
      if (count < barter.count) {
        const itemData = ITEMS[barter.itemId]
        missing.push(`${itemData?.name || barter.itemId} x${barter.count - count}`)
      }
    }
  }

  return { canAfford: missing.length === 0, missing }
}

export function deductPriceFromInventory(
  inventory: InventoryItem[],
  price: MerchantPrice,
): InventoryItem[] {
  let newInventory = [...inventory]

  for (const [key, value] of Object.entries(price)) {
    if (key === 'barterItems') continue
    if (typeof value === 'number' && value > 0) {
      const itemId = getPriceItemId(key as keyof MerchantPrice)
      newInventory = removeFromInventory(newInventory, itemId, value)
    }
  }

  if (price.barterItems) {
    for (const barter of price.barterItems) {
      newInventory = removeFromInventory(newInventory, barter.itemId, barter.count)
    }
  }

  return newInventory
}

export function getCurrentStock(
  merchant: Merchant,
  merchantState: MerchantState,
  itemIndex: number,
): number {
  const stockOverrides = merchantState.merchantStockOverrides[merchant.id]
  if (stockOverrides && stockOverrides[itemIndex.toString()] !== undefined) {
    return stockOverrides[itemIndex.toString()]
  }
  return merchant.inventory[itemIndex]?.stock ?? 0
}

export function updateStock(
  merchantState: MerchantState,
  merchantId: string,
  itemIndex: number,
  newStock: number,
): MerchantState {
  const newOverrides = {
    ...merchantState.merchantStockOverrides,
    [merchantId]: {
      ...(merchantState.merchantStockOverrides[merchantId] || {}),
      [itemIndex.toString()]: newStock,
    },
  }

  return {
    ...merchantState,
    merchantStockOverrides: newOverrides,
  }
}

export function checkItemRequirements(
  inventoryItem: MerchantInventoryItem,
  _inventory: InventoryItem[],
  reputation: ReputationMap,
  flags: Record<string, boolean | number | string>,
): { canBuy: boolean; reason?: string } {
  if (inventoryItem.minReputation) {
    if (!checkReputationRequirement(reputation, inventoryItem.minReputation.factionId, inventoryItem.minReputation.value)) {
      const factionName = inventoryItem.minReputation.factionId
      return {
        canBuy: false,
        reason: `需要${factionName}声望达到${inventoryItem.minReputation.value}`,
      }
    }
  }

  if (inventoryItem.requiredFlag) {
    if (!flags[inventoryItem.requiredFlag]) {
      return {
        canBuy: false,
        reason: '尚未解锁购买条件',
      }
    }
  }

  return { canBuy: true }
}

export function getAvailableItems(
  merchant: Merchant,
  merchantState: MerchantState,
  inventory: InventoryItem[],
  reputation: ReputationMap,
  flags: Record<string, boolean | number | string>,
): AvailableItemResult[] {
  const results: AvailableItemResult[] = []

  for (let i = 0; i < merchant.inventory.length; i++) {
    const item = merchant.inventory[i]
    const adjusted = adjustPrice(item.basePrice, merchant, reputation, flags)
    const { canAfford, missing } = canAffordPrice(inventory, adjusted.adjustedPrice)
    const reqCheck = checkItemRequirements(item, inventory, reputation, flags)
    const currentStock = getCurrentStock(merchant, merchantState, i)

    let canBuy = reqCheck.canBuy && canAfford && currentStock > 0
    let reason: string | undefined

    if (!reqCheck.canBuy) {
      reason = reqCheck.reason
    } else if (currentStock <= 0) {
      reason = '库存已售罄'
    } else if (!canAfford) {
      reason = `缺少: ${missing.join(', ')}`
    }

    results.push({
      item,
      adjustedPrice: adjusted,
      canAfford,
      canBuy,
      reason,
      currentStock,
    })
  }

  return results
}

export function getMerchantDialogue(
  merchant: Merchant,
  flags: Record<string, boolean | number | string>,
): string {
  if (merchant.specialDialogue) {
    for (const dialogue of merchant.specialDialogue) {
      if (flags[dialogue.flagKey]) {
        return dialogue.text
      }
    }
  }
  return merchant.welcomeText
}

export function tryMerchantEncounter(
  tileId: string,
  day: number,
  dangerLevel: number,
  isNight: boolean,
  merchantState: MerchantState,
): Merchant | null {
  const merchants = getMerchantsForTile(tileId, day, dangerLevel, isNight)
  return rollMerchantEncounter(merchants, isNight, merchantState.encounteredMerchants, day)
}

export function recordMerchantEncounter(
  merchantState: MerchantState,
  merchantId: string,
  tileId: string,
  day: number,
  phase: 'day' | 'night',
): MerchantState {
  const encounterInfo: MerchantEncounterInfo = {
    merchantId,
    tileId,
    day,
    phase,
  }

  const encounteredCount = (merchantState.encounteredMerchants[merchantId] || 0) + 1

  return {
    ...merchantState,
    currentMerchant: merchantId,
    encounterInfo,
    encounteredMerchants: {
      ...merchantState.encounteredMerchants,
      [merchantId]: encounteredCount,
    },
  }
}

export function purchaseItem(
  merchant: Merchant,
  itemIndex: number,
  merchantState: MerchantState,
  inventory: InventoryItem[],
  reputation: ReputationMap,
  flags: Record<string, boolean | number | string>,
  _identity: { id: string },
): {
  result: MerchantTransactionResult
  newInventory: InventoryItem[]
  newMerchantState: MerchantState
  newFlags: Record<string, boolean | number | string>
  newReputation: ReputationMap
  triggeredEvent?: string
} {
  const inventoryItem = merchant.inventory[itemIndex]
  const defaultResult: MerchantTransactionResult = {
    success: false,
    count: 0,
    messages: [],
  }

  if (!inventoryItem) {
    return {
      result: { ...defaultResult, messages: ['商品不存在'] },
      newInventory: inventory,
      newMerchantState: merchantState,
      newFlags: flags,
      newReputation: reputation,
    }
  }

  const currentStock = getCurrentStock(merchant, merchantState, itemIndex)
  if (currentStock <= 0) {
    return {
      result: { ...defaultResult, messages: ['该商品库存已售罄'] },
      newInventory: inventory,
      newMerchantState: merchantState,
      newFlags: flags,
      newReputation: reputation,
    }
  }

  const reqCheck = checkItemRequirements(inventoryItem, inventory, reputation, flags)
  if (!reqCheck.canBuy) {
    return {
      result: { ...defaultResult, messages: [reqCheck.reason || '无法购买该商品'] },
      newInventory: inventory,
      newMerchantState: merchantState,
      newFlags: flags,
      newReputation: reputation,
    }
  }

  const adjusted = adjustPrice(inventoryItem.basePrice, merchant, reputation, flags)
  const { canAfford, missing } = canAffordPrice(inventory, adjusted.adjustedPrice)
  if (!canAfford) {
    return {
      result: {
        ...defaultResult,
        messages: [`资源不足，缺少: ${missing.join(', ')}`],
      },
      newInventory: inventory,
      newMerchantState: merchantState,
      newFlags: flags,
      newReputation: reputation,
    }
  }

  let newInventory = deductPriceFromInventory(inventory, adjusted.adjustedPrice)
  newInventory = addToInventory(newInventory, inventoryItem.itemId, 1)

  let newMerchantState = updateStock(merchantState, merchant.id, itemIndex, currentStock - 1)

  const dealCount = (newMerchantState.successfulDeals[merchant.id] || 0) + 1
  newMerchantState = {
    ...newMerchantState,
    successfulDeals: {
      ...newMerchantState.successfulDeals,
      [merchant.id]: dealCount,
    },
  }

  const messages: string[] = []
  const itemData = ITEMS[inventoryItem.itemId]
  messages.push(`成功购买: ${itemData?.name || inventoryItem.itemId} x1`)

  if (adjusted.discountMultiplier < 1.0) {
    const discount = Math.round((1 - adjusted.discountMultiplier) * 100)
    messages.push(`享受了 ${discount}% 的阵营折扣！`)
  }

  const newFlags = { ...flags }
  const newReputation = { ...reputation }
  let triggeredEvent: string | undefined
  const reputationChanges: { factionId: FactionId; value: number }[] = []
  const statsChanges: MerchantTransactionResult['statsChanges'] = {}

  if (merchant.factionPreference !== 'neutral') {
    const factionId = merchant.factionPreference as FactionId
    const repGain = inventoryItem.category === 'intel' ? 8 : inventoryItem.category === 'rare_material' ? 5 : 3
    newReputation[factionId] = (newReputation[factionId] || 0) + repGain
    reputationChanges.push({ factionId, value: repGain })
    messages.push(`${factionId}声望 +${repGain}`)
  }

  if (inventoryItem.category === 'intel') {
    messages.push('📚 你获得了珍贵的情报...')
  } else if (inventoryItem.category === 'rare_material') {
    messages.push('💎 你获得了稀有的材料...')
  } else if (inventoryItem.category === 'contraband') {
    messages.push('⚠️ 你获得了禁忌物资...小心使用')
  }

  if (inventoryItem.triggersEventOnBuy) {
    triggeredEvent = inventoryItem.triggersEventOnBuy
    messages.push('🔮 这个物品似乎会触发某些事件...')
  }

  if (merchant.id === 'merchant_wanderer' && dealCount >= 3 && !newFlags['merchant_wanderer_friend']) {
    newFlags['merchant_wanderer_friend'] = true
    messages.push('🤝 流浪商人拍了拍你的肩膀："看来你做了不少生意，以后就是朋友了！"')
  }
  if (merchant.id === 'merchant_legendary' && !newFlags['legendary_merchant_return']) {
    newFlags['legendary_merchant_return'] = true
  }

  if (inventoryItem.itemId === 'forbidden_serum') {
    statsChanges.sanity = -10
    messages.push('💉 只是触碰这个血清，你就感到一阵眩晕...')
  }
  if (inventoryItem.itemId === 'abyss_elixir') {
    statsChanges.sanity = -5
    statsChanges.pollution = 5
  }

  return {
    result: {
      success: true,
      boughtItemId: inventoryItem.itemId,
      count: 1,
      messages,
      triggeredEvent,
      reputationChanges,
      statsChanges,
    },
    newInventory,
    newMerchantState,
    newFlags,
    newReputation,
    triggeredEvent,
  }
}

export function closeMerchantInteraction(merchantState: MerchantState): MerchantState {
  return {
    ...merchantState,
    currentMerchant: null,
    encounterInfo: null,
  }
}

export function getPriceDisplay(price: MerchantPrice): string[] {
  const parts: string[] = []

  for (const [key, value] of Object.entries(price)) {
    if (key === 'barterItems') continue
    if (typeof value === 'number' && value > 0) {
      const itemId = getPriceItemId(key as keyof MerchantPrice)
      const itemData = ITEMS[itemId]
      parts.push(`${itemData?.icon || ''}${itemData?.name || itemId} x${value}`)
    }
  }

  if (price.barterItems) {
    for (const barter of price.barterItems) {
      const itemData = ITEMS[barter.itemId]
      parts.push(`${itemData?.icon || ''}${itemData?.name || barter.itemId} x${barter.count}`)
    }
  }

  return parts
}

export function getMerchantReputationBonus(
  merchant: Merchant,
  reputation: ReputationMap,
): { level: string; color: string } {
  if (merchant.factionPreference === 'neutral') {
    return { level: '中立', color: '#888888' }
  }

  const rep = reputation[merchant.factionPreference] || 0
  if (rep >= 60) return { level: '亲密盟友', color: '#5ec98a' }
  if (rep >= 30) return { level: '友善', color: '#7abf5a' }
  if (rep >= 0) return { level: '普通', color: '#888888' }
  if (rep >= -30) return { level: '冷淡', color: '#d9a54c' }
  return { level: '敌视', color: '#c44a4a' }
}
