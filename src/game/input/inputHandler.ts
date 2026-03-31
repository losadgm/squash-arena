import * as THREE from 'three';

export class InputHandler {
  mouseNDC = new THREE.Vector2(0, 0);
  private onMove: (e: MouseEvent) => void;
  private onResize: (e: Event) => void;
  private resizeCb?: (w: number, h: number) => void;

  constructor(resizeCb?: (w: number, h: number) => void) {
    this.resizeCb = resizeCb;
    this.onMove = (e: MouseEvent) => {
      this.mouseNDC.x = -((e.clientX / window.innerWidth) * 2 - 1);
      this.mouseNDC.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    this.onResize = () => this.resizeCb?.(window.innerWidth, window.innerHeight);

    document.addEventListener('mousemove', this.onMove);
    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    document.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('resize', this.onResize);
  }
}
