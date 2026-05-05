import { NgZone, Renderer2, ChangeDetectorRef } from '@angular/core';
import { DrawerState, DRAWER_TRANSITION_DURATION_MS } from './mobile-menu.constants';

export interface TransitionConfig {
  getMenuElement: () => HTMLElement | null;
  getOverlayElement: () => HTMLElement | null;
  prefersReducedMotion: () => boolean;
  getDrawerTransition: () => string;
  onStateChange: (state: DrawerState) => void;
  onUpdateTranslate: (translateX: number) => void;
  onLockScroll: () => void;
  onUnlockScroll: () => void;
  onRegisterOverlay: () => void;
  onUnregisterOverlay: () => void;
  onTriggerHaptic: () => void;
  onA11yOpen: () => void;
  onA11yClose: () => void;
  onA11yInitialFocus: () => void;
}

export class DrawerTransitionCoordinator {
  private transitionEndUnlisten: (() => void) | null = null;
  private transitionFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  public currentState: DrawerState = DrawerState.CLOSED;

  constructor(
    private config: TransitionConfig,
    private renderer: Renderer2,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef
  ) {}

  public transitionTo(newState: DrawerState, options: { immediate?: boolean; targetTranslateX?: number } = {}): void {
    if (this.currentState === newState && !options.immediate) return;

    this.currentState = newState;
    this.config.onStateChange(newState);

    switch (newState) {
      case DrawerState.OPENING: {
        this.config.onUpdateTranslate(0);
        this.config.onLockScroll();
        this.config.onRegisterOverlay();
        this.config.onTriggerHaptic();
        this.config.onA11yOpen();

        const overlay = this.config.getOverlayElement();
        if (overlay) {
          overlay.classList.add('visible');
          this.renderer.setStyle(overlay, '--mm-overlay-progress', '1.000');
        }

        this.handleTransitionEnd(DrawerState.OPEN, () => {
          this.config.onA11yInitialFocus();
        });
        break;
      }

      case DrawerState.CLOSING: {
        if (options.targetTranslateX !== undefined) {
          this.config.onUpdateTranslate(options.targetTranslateX);
        }
        this.config.onUnlockScroll();
        this.config.onUnregisterOverlay();
        this.config.onTriggerHaptic();
        this.config.onA11yClose();

        const overlayClose = this.config.getOverlayElement();
        if (overlayClose) {
          overlayClose.classList.remove('visible');
          this.renderer.removeStyle(overlayClose, 'opacity');
          this.renderer.removeStyle(overlayClose, 'backdrop-filter');
        }
        this.handleTransitionEnd(DrawerState.CLOSED);
        break;
      }

      case DrawerState.DRAGGING:
        this.clearTransitionListeners();
        break;

      case DrawerState.OPEN:
      case DrawerState.CLOSED:
        this.clearTransitionListeners();
        break;
    }

    this.cdRef.markForCheck();
  }

  public clearTransitionListeners(): void {
    if (this.transitionEndUnlisten) {
      this.transitionEndUnlisten();
      this.transitionEndUnlisten = null;
    }
    if (this.transitionFallbackTimer !== null) {
      clearTimeout(this.transitionFallbackTimer);
      this.transitionFallbackTimer = null;
    }
  }

  private handleTransitionEnd(targetState: DrawerState, callback?: () => void): void {
    this.clearTransitionListeners();

    const menuElement = this.config.getMenuElement();
    if (!menuElement) {
      this.currentState = targetState;
      this.config.onStateChange(targetState);
      callback?.();
      return;
    }

    const reducedMotion = this.config.prefersReducedMotion();

    if (!reducedMotion) {
      this.transitionEndUnlisten = this.renderer.listen(
        menuElement,
        'transitionend',
        (event: TransitionEvent) => {
          if (event.propertyName !== 'transform') return;
          this.clearTransitionListeners();
          this.ngZone.run(() => {
            if (this.currentState === DrawerState.OPENING || this.currentState === DrawerState.CLOSING) {
              this.currentState = targetState;
              this.config.onStateChange(targetState);
              callback?.();
              this.cdRef.markForCheck();
            }
          });
        }
      );
    }

    this.transitionFallbackTimer = setTimeout(() => {
      this.transitionFallbackTimer = null;
      if (this.transitionEndUnlisten) {
        this.transitionEndUnlisten();
        this.transitionEndUnlisten = null;
      }
      this.ngZone.run(() => {
        if (this.currentState === DrawerState.OPENING || this.currentState === DrawerState.CLOSING) {
          this.currentState = targetState;
          this.config.onStateChange(targetState);
          callback?.();
          this.cdRef.markForCheck();
        }
      });
    }, reducedMotion ? 0 : DRAWER_TRANSITION_DURATION_MS + 100);
  }

  public destroy(): void {
    this.clearTransitionListeners();
  }
}
