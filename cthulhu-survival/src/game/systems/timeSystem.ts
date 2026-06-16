import type { TimeState, DayPhase } from '../types/game'
import type { Identity } from '../types/identity'

export function createInitialTime(identity: Identity): TimeState {
  const bonusActions = identity.skills.reduce((acc, s) => {
    if (s.effect.type === 'increase_action_points') return acc + s.effect.value
    return acc
  }, 0)

  return {
    day: 1,
    phase: 'day',
    actionsLeft: 4 + bonusActions,
    maxActionsPerPhase: 4 + bonusActions,
  }
}

export function consumeAction(time: TimeState, amount: number = 1): { time: TimeState; phaseChanged: boolean; dayChanged: boolean } {
  let newTime = { ...time }
  let phaseChanged = false
  let dayChanged = false

  newTime.actionsLeft = Math.max(0, newTime.actionsLeft - amount)

  if (newTime.actionsLeft <= 0) {
    const result = advancePhase(newTime)
    newTime = result.time
    phaseChanged = result.phaseChanged
    dayChanged = result.dayChanged
  }

  return { time: newTime, phaseChanged, dayChanged }
}

export function advancePhase(time: TimeState): { time: TimeState; phaseChanged: boolean; dayChanged: boolean } {
  const newTime = { ...time }
  let phaseChanged = false
  let dayChanged = false

  if (time.phase === 'day') {
    newTime.phase = 'night'
    phaseChanged = true
  } else {
    newTime.phase = 'day'
    newTime.day += 1
    phaseChanged = true
    dayChanged = true
  }

  newTime.actionsLeft = newTime.maxActionsPerPhase

  return { time: newTime, phaseChanged, dayChanged }
}

export function isNight(time: TimeState): boolean {
  return time.phase === 'night'
}

export function getPhaseDescription(phase: DayPhase): string {
  return phase === 'day' ? '白天' : '夜晚'
}

export function getDayNightIcon(phase: DayPhase): string {
  return phase === 'day' ? '☀️' : '🌙'
}
