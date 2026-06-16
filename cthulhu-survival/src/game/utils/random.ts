export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

export function chance(percent: number): boolean {
  return Math.random() < percent
}

export function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function pickRandomWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * total
  for (let i = 0; i < items.length; i++) {
    random -= weights[i]
    if (random <= 0) return items[i]
  }
  return items[items.length - 1]
}

export function weightedRandom(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0)
  let random = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i]
    if (random <= 0) return i
  }
  return weights.length - 1
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
