import Phaser from 'phaser'
import type { MapTile, Position, TileType, DayPhase } from '@game/types/game'
import { MAP_TILES } from '@game/data/events'
import { calculateDangerInfo } from '@game/systems/dangerSystem'

const TILE_SIZE = 64
const MAP_OFFSET_X = 60
const MAP_OFFSET_Y = 60

const TILE_COLORS: Record<TileType, number> = {
  forest: 0x2d4a3e,
  ruins: 0x5a5040,
  lake: 0x2c3e5a,
  cave: 0x3a2e3a,
  village: 0x5e4a3a,
  shrine: 0x4a3a5e,
  camp: 0x6b5a3a,
}

const TILE_ICONS: Record<TileType, string> = {
  forest: '🌲',
  ruins: '🏛️',
  lake: '💧',
  cave: '🕳️',
  village: '🏚️',
  shrine: '⛩️',
  camp: '⛺',
}

const TILE_NAMES: Record<TileType, string> = {
  forest: '森林',
  ruins: '遗迹',
  lake: '湖泊',
  cave: '洞穴',
  village: '村庄',
  shrine: '神社',
  camp: '营地',
}

const DANGER_COLORS: Record<string, number> = {
  safe: 0x5ec98a,
  low: 0xa8d96e,
  medium: 0xd9a54c,
  high: 0xe68a4c,
  extreme: 0xc44a4a,
}

export interface GameSceneCallbacks {
  onTileClick: (tile: MapTile) => void
}

export class GameScene extends Phaser.Scene {
  private tileGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map()
  private tileTexts: Map<string, Phaser.GameObjects.Text> = new Map()
  private tileIcons: Map<string, Phaser.GameObjects.Text> = new Map()
  private tileDangerBadges: Map<string, Phaser.GameObjects.Text> = new Map()
  private playerSprite: Phaser.GameObjects.Container | null = null
  private playerIcon: Phaser.GameObjects.Text | null = null
  private nightOverlay: Phaser.GameObjects.Graphics | null = null
  private callbacks: GameSceneCallbacks | null = null
  private currentPosition: Position = { x: 4, y: 3 }
  private discoveredTiles: Set<string> = new Set()
  private isNight: boolean = false
  private pollution: number = 0

  constructor() {
    super('GameScene')
  }

  setCallbacks(callbacks: GameSceneCallbacks) {
    this.callbacks = callbacks
  }

  create() {
    this.cameras.main.setBackgroundColor(0x0a0a12)

    this.drawMap()
    this.nightOverlay = this.add.graphics()
    this.createPlayer()
    this.updateNightOverlay()
  }

  private drawMap() {
    for (const tile of MAP_TILES) {
      this.drawTile(tile)
    }
  }

  private drawTile(tile: MapTile) {
    const x = MAP_OFFSET_X + tile.x * TILE_SIZE
    const y = MAP_OFFSET_Y + tile.y * TILE_SIZE
    const key = this.tileKey(tile.x, tile.y)
    const isDiscovered = this.discoveredTiles.has(tile.id)

    const graphics = this.add.graphics()
    graphics.setInteractive(new Phaser.Geom.Rectangle(0, 0, TILE_SIZE, TILE_SIZE), Phaser.Geom.Rectangle.Contains)

    graphics.on('pointerdown', () => {
      if (this.callbacks?.onTileClick) {
        this.callbacks.onTileClick(tile)
      }
    })

    graphics.on('pointerover', () => {
      this.tileTexts.get(key)?.setStyle({ color: '#5ec98a' })
      graphics.clear()
      this.paintTile(graphics, tile, true, this.isAdjacent(tile), isDiscovered)
    })

    graphics.on('pointerout', () => {
      this.tileTexts.get(key)?.setStyle({ color: '#e8e8f0' })
      graphics.clear()
      this.paintTile(graphics, tile, false, this.isAdjacent(tile), isDiscovered)
    })

    this.paintTile(graphics, tile, false, this.isAdjacent(tile), isDiscovered)
    graphics.setPosition(x, y)

    this.tileGraphics.set(key, graphics)

    const icon = this.add.text(x + TILE_SIZE / 2, y + TILE_SIZE / 2 - 6, TILE_ICONS[tile.type], {
      fontSize: '24px',
    }).setOrigin(0.5)
    this.tileIcons.set(key, icon)

    const name = this.add.text(x + TILE_SIZE / 2, y + TILE_SIZE - 8, TILE_NAMES[tile.type], {
      fontSize: '11px',
      color: isDiscovered ? '#e8e8f0' : '#5e5e7a',
      fontFamily: 'sans-serif',
    }).setOrigin(0.5)
    this.tileTexts.set(key, name)

    const dangerBadge = this.add.text(x + TILE_SIZE - 8, y + 8, '', {
      fontSize: '14px',
    }).setOrigin(1, 0)
    dangerBadge.setVisible(false)
    dangerBadge.setDepth(5)
    this.tileDangerBadges.set(key, dangerBadge)
  }

  private paintTile(
    graphics: Phaser.GameObjects.Graphics,
    tile: MapTile,
    hovered: boolean,
    adjacent: boolean,
    discovered: boolean,
  ) {
    const size = TILE_SIZE - 4
    const x = 2
    const y = 2

    if (!discovered) {
      graphics.fillStyle(0x151520, 1)
      graphics.fillRect(x, y, size, size)
      graphics.lineStyle(1, 0x2e2e45, 1)
      graphics.strokeRect(x, y, size, size)
      return
    }

    const phase = this.getPhase()
    const dangerInfo = calculateDangerInfo(tile, phase, this.pollution)
    const dangerColor = DANGER_COLORS[dangerInfo.level] || 0x5ec98a

    let color = TILE_COLORS[tile.type]
    if (hovered) {
      graphics.lineStyle(2, 0x5ec98a, 1)
    } else if (adjacent) {
      graphics.lineStyle(2, dangerColor, 0.7)
    } else {
      graphics.lineStyle(1, dangerColor, 0.4)
    }

    graphics.fillStyle(color, hovered ? 0.95 : 0.85)
    graphics.fillRect(x, y, size, size)
    graphics.strokeRect(x, y, size, size)

    const dangerOverlayAlpha = dangerInfo.value / 100 * 0.35
    if (dangerOverlayAlpha > 0) {
      graphics.fillStyle(dangerColor, dangerOverlayAlpha)
      graphics.fillRect(x, y, size, size)
    }

    const key = this.tileKey(tile.x, tile.y)
    const badge = this.tileDangerBadges.get(key)
    if (badge && discovered) {
      badge.setText(`${dangerInfo.icon}`)
      badge.setAlpha(dangerInfo.value > 15 ? 1 : 0.5)
      badge.setVisible(true)
    }
  }

  private createPlayer() {
    const { x, y } = this.getTilePixelPosition(this.currentPosition.x, this.currentPosition.y)
    this.playerSprite = this.add.container(x, y)

    const bg = this.add.graphics()
    bg.fillStyle(0x5ec98a, 0.9)
    bg.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, 18)
    bg.lineStyle(2, 0xffffff, 1)
    bg.strokeCircle(TILE_SIZE / 2, TILE_SIZE / 2, 18)

    this.playerIcon = this.add.text(TILE_SIZE / 2, TILE_SIZE / 2 - 2, '👤', {
      fontSize: '22px',
    }).setOrigin(0.5)

    this.playerSprite.add([bg, this.playerIcon])
    this.playerSprite.setDepth(10)
  }

  updatePlayerPosition(pos: Position, identityIcon: string = '👤') {
    if (!this.playerSprite) return
    this.currentPosition = pos
    const { x, y } = this.getTilePixelPosition(pos.x, pos.y)

    this.tweens.add({
      targets: this.playerSprite,
      x,
      y,
      duration: 350,
      ease: 'Sine.easeInOut',
    })

    if (this.playerIcon) {
      this.playerIcon.setText(identityIcon)
    }
  }

  updateDiscoveredTiles(tiles: string[]) {
    this.discoveredTiles = new Set(tiles)
    this.redrawAllTiles()
  }

  setIsNight(night: boolean) {
    this.isNight = night
    this.updateNightOverlay()
    this.redrawAllTiles()
  }

  setPollution(pollution: number) {
    this.pollution = pollution
    this.redrawAllTiles()
  }

  getPhase(): DayPhase {
    return this.isNight ? 'night' : 'day'
  }

  private updateNightOverlay() {
    if (!this.nightOverlay) return
    this.nightOverlay.clear()
    if (this.isNight) {
      this.nightOverlay.fillStyle(0x0a0a28, 0.35)
      this.nightOverlay.fillRect(0, 0, 1000, 1000)
    }
  }

  private redrawAllTiles() {
    for (const tile of MAP_TILES) {
      const key = this.tileKey(tile.x, tile.y)
      const graphics = this.tileGraphics.get(key)
      const text = this.tileTexts.get(key)
      if (!graphics) continue

      graphics.clear()
      this.paintTile(graphics, tile, false, this.isAdjacent(tile), this.discoveredTiles.has(tile.id))

      if (text) {
        text.setStyle({ color: this.discoveredTiles.has(tile.id) ? '#e8e8f0' : '#5e5e7a' })
      }
    }
  }

  private isAdjacent(tile: MapTile): boolean {
    const dx = Math.abs(tile.x - this.currentPosition.x)
    const dy = Math.abs(tile.y - this.currentPosition.y)
    return (dx <= 1 && dy <= 1) && !(dx === 0 && dy === 0)
  }

  private getTilePixelPosition(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: MAP_OFFSET_X + tileX * TILE_SIZE,
      y: MAP_OFFSET_Y + tileY * TILE_SIZE,
    }
  }

  private tileKey(x: number, y: number): string {
    return `${x},${y}`
  }
}
