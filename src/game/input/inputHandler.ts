import * as THREE from 'three';

export class InputHandler {
  public mouseNDC: THREE.Vector2 = new THREE.Vector2(0, 0);
  private onMouseMove: (e: MouseEvent) => void;
  private onWindowResize: (e: Event) => void;
  private onResizeCallback?: (w: number, h: number) => void;

  constructor(onResizeCallback?: (w: number, h: number) => void) {
    this.onResizeCallback = onResizeCallback;
    this.onMouseMove = this.handleMouseMove.bind(this);
    this.onWindowResize = this.handleWindowResize.bind(this);

    document.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('resize', this.onWindowResize);
  }

  private handleMouseMove(e: MouseEvent) {
    this.mouseNDC.x = -((e.clientX / window.innerWidth) * 2 - 1);
    this.mouseNDC.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  private handleWindowResize() {
    if (this.onResizeCallback) {
      this.onResizeCallback(window.innerWidth, window.innerHeight);
    }
  }

  destroy() {
    document.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('resize', this.onWindowResize);
  }
}
