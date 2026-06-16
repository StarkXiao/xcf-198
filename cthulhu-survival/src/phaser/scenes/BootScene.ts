import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {
    // 暂无外部资源需要加载，后续可扩展
  }

  create() {
    this.scene.start('GameScene')
  }
}
