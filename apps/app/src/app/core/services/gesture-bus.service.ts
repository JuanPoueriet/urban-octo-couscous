import { Injectable, NgZone, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AnalyticsService } from './analytics.service';

export interface GestureHandler {
  name: string;
  priority: number;
  onPointerDown?: (event: PointerEvent) => boolean | void;
  onPointerMove?: (event: PointerEvent) => void;
  onPointerUp?: (event: PointerEvent) => void;
  onPointerCancel?: (event: PointerEvent) => void;
}

@Injectable({
  providedIn: 'root',
})
export class GestureBusService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private ngZone = inject(NgZone);
  private isBrowser = isPlatformBrowser(this.platformId);
  private analytics = inject(AnalyticsService);

  private handlers: GestureHandler[] = [];
  private activeHandler: GestureHandler | null = null;

  constructor() {
    if (this.isBrowser) {
      this.ngZone.runOutsideAngular(() => {
        document.addEventListener('pointerdown',   this.handlePointerDown,   { capture: true });
        document.addEventListener('pointermove',   this.handlePointerMove,   { capture: true });
        document.addEventListener('pointerup',     this.handlePointerUp,     { capture: true });
        document.addEventListener('pointercancel', this.handlePointerCancel, { capture: true });
      });
    }
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    document.removeEventListener('pointerdown',   this.handlePointerDown,   { capture: true });
    document.removeEventListener('pointermove',   this.handlePointerMove,   { capture: true });
    document.removeEventListener('pointerup',     this.handlePointerUp,     { capture: true });
    document.removeEventListener('pointercancel', this.handlePointerCancel, { capture: true });
    this.handlers = [];
    this.activeHandler = null;
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
    // Defensive: discard any stale activeHandler from a previously lost pointerup/cancel
    this.activeHandler = null;

    for (const handler of this.handlers) {
      if (handler.onPointerDown) {
        if (handler.onPointerDown(event)) {
          this.activeHandler = handler;
          break;
        }
      }
    }
  };

  private handlePointerMove = (event: PointerEvent): void => {
    this.activeHandler?.onPointerMove?.(event);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    this.activeHandler?.onPointerUp?.(event);
    this.activeHandler = null;
  };

  private handlePointerCancel = (event: PointerEvent): void => {
    this.activeHandler?.onPointerCancel?.(event);
    this.activeHandler = null;
  };
}
