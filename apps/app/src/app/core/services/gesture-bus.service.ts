import { Injectable, NgZone, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface GestureHandler {
  priority: number;
  onPointerDown?: (event: PointerEvent) => boolean | void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onPointerCancel?: (event: PointerEvent) => void;
}

@Injectable({
  providedIn: 'root',
})
export class GestureBusService {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private isBrowser = isPlatformBrowser(this.platformId);

  private handlers: GestureHandler[] = [];
  private activeHandler: GestureHandler | null = null;

  constructor() {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        document.addEventListener('pointerdown', this.handlePointerDown, { capture: true });
        document.addEventListener('pointermove', this.handlePointerMove, { capture: true });
        document.addEventListener('pointerup', this.handlePointerUp, { capture: true });
        document.addEventListener('pointercancel', this.handlePointerCancel, { capture: true });
      });
    }
  }

  registerHandler(handler: GestureHandler): () => void {
    this.handlers.push(handler);
    this.handlers.sort((a, b) => b.priority - a.priority);

    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
      if (this.activeHandler === handler) {
        this.activeHandler = null;
      }
    };
  }

  private handlePointerDown = (event: PointerEvent): void => {
    // S2 — Priority-based gesture arbitration.
    // The first handler (highest priority) that returns true from onPointerDown
    // "captures" the gesture.
    for (const handler of this.handlers) {
      if (handler.onPointerDown) {
        const captured = handler.onPointerDown(event);
        if (captured) {
          this.activeHandler = handler;
          break;
        }
      }
    }
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.activeHandler?.onPointerMove) {
      this.activeHandler.onPointerMove(event);
    }
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (this.activeHandler?.onPointerUp) {
      this.activeHandler.onPointerUp(event);
    }
    this.activeHandler = null;
  };

  private handlePointerCancel = (event: PointerEvent): void => {
    if (this.activeHandler?.onPointerCancel) {
      this.activeHandler.onPointerCancel(event);
    }
    this.activeHandler = null;
  };
}
