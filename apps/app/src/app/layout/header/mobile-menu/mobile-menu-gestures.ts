import { NgZone } from '@angular/core';

export interface MobileMenuGestureConfig {
  /** Percentage cap for elastic X scale (e.g. 8 => scaleX <= 1.08). */
  maxStretchPercent?: number;
  menuWidth: number;
  isRtl: () => boolean;
  isOpen: () => boolean;
  isAnimating: () => boolean;
  onUpdateTranslate: (
    translateX: number,
    progress: number | null,
    scaleX?: number,
    transformOrigin?: string
  ) => void;
  onOpen: () => void;
  onClose: () => void;
  onToggleHaptic: () => void;
}

export class MobileMenuGestures {
  // Configuración de gestos
  private readonly EDGE_THRESHOLD = 20;
  private readonly OPEN_THRESHOLD = 0.3;
  private readonly MIN_SWIPE_DISTANCE = 30;
  private readonly VELOCITY_THRESHOLD = 0.3;
  private readonly HORIZONTAL_THRESHOLD = 10;
  private readonly VERTICAL_LOCK_THRESHOLD = 10;

  // Estado del gesto
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private startTime = 0;
  private isHorizontalGesture = false;
  private initialTranslateX = 0;
  private lastDragPosition = 0;
  private wasOvershooting = false;

  constructor(
    private config: MobileMenuGestureConfig,
    private ngZone: NgZone
  ) {}

  public getIsDragging(): boolean {
    return this.isDragging;
  }

  public getIsHorizontalGesture(): boolean {
    return this.isHorizontalGesture;
  }

  public updateMenuWidth(width: number) {
    this.config.menuWidth = width;
  }


  private getClosedPosition(menuWidth: number): number {
    return this.config.isRtl() ? menuWidth : -menuWidth;
  }

  private getProgress(translateX: number, menuWidth: number): number {
    const closed = this.getClosedPosition(menuWidth);
    const progress = this.config.isRtl()
      ? (closed - translateX) / menuWidth
      : (translateX - closed) / menuWidth;

    return progress;
  }

  private readonly DEFAULT_MAX_STRETCH_PERCENT = 8;
  private readonly ELASTIC_OVERSHOOT_REFERENCE_RATIO = 0.25;

  private calculateElasticScale(overshoot: number): number {
    const safeOvershoot = Math.max(0, overshoot);
    if (safeOvershoot === 0) return 1;

    const maxStretchPercent = Math.max(0, this.config.maxStretchPercent ?? this.DEFAULT_MAX_STRETCH_PERCENT);
    const maxScale = 1 + maxStretchPercent / 100;

    const referenceOvershootPx = Math.max(1, this.config.menuWidth * this.ELASTIC_OVERSHOOT_REFERENCE_RATIO);
    const normalizedOvershoot = Math.min(safeOvershoot / referenceOvershootPx, 1);

    const damped = Math.sqrt(normalizedOvershoot);
    return 1 + damped * (maxScale - 1);
  }

  private getElasticTransform(
    translateX: number,
    min: number,
    max: number,
    isRtl: boolean
  ): { translateX: number; scaleX: number; transformOrigin: string } {
    let finalTranslateX = translateX;
    let scaleX = 1;
    let transformOrigin = isRtl ? 'right' : 'left';

    if (translateX > max) {
      // Overshoot right
      finalTranslateX = max;
      const overshoot = translateX - max;
      scaleX = this.calculateElasticScale(overshoot);
      // LTR: opening more (max=0), anchor left. RTL: closing more (max=W), anchor left.
      transformOrigin = 'left';
    } else if (translateX < min) {
      // Overshoot left
      finalTranslateX = min;
      const overshoot = min - translateX;
      scaleX = this.calculateElasticScale(overshoot);
      // LTR: closing more (min=-W), anchor right. RTL: opening more (min=0), anchor right.
      transformOrigin = 'right';
    }

    return { translateX: finalTranslateX, scaleX, transformOrigin };
  }

  public onMenuTouchStart(event: TouchEvent) {
    if (!this.config.isOpen() || this.config.isAnimating()) return;

    event.stopPropagation();
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.startTime = Date.now();
    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.wasOvershooting = false;

    // When already open, the initial translation is 0
    this.initialTranslateX = 0;
    this.lastDragPosition = 0;

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('touchmove', this.handleMenuDragMove, { passive: false });
      document.addEventListener('touchend', this.handleMenuDragEnd);
      document.addEventListener('touchcancel', this.handleMenuDragCancel);
    });
  }

  public onMenuTouchMove(event: TouchEvent) {
    if (!this.config.isOpen()) return;

    const touch = event.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;

    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isDragging && !this.isHorizontalGesture) {
      if (absDiffY > this.VERTICAL_LOCK_THRESHOLD && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        return;
      }

      if (absDiffX > this.HORIZONTAL_THRESHOLD && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
        this.isDragging = true;
        event.preventDefault();
        event.stopPropagation();
        this.config.onToggleHaptic();
      } else {
        return;
      }
    }

    if (!this.isHorizontalGesture || !this.isDragging) return;

    event.preventDefault();
    event.stopPropagation();

    const menuWidth = this.config.menuWidth;
    const isRtl = this.config.isRtl();

    const min = isRtl ? 0 : -menuWidth;
    const max = isRtl ? menuWidth : 0;

    const targetTranslate = this.initialTranslateX + diffX;
    const transform = this.getElasticTransform(targetTranslate, min, max, isRtl);

    const isOvershooting = transform.scaleX > 1;
    if (isOvershooting && !this.wasOvershooting) {
      this.config.onToggleHaptic();
    }
    this.wasOvershooting = isOvershooting;

    this.lastDragPosition = transform.translateX;
    this.config.onUpdateTranslate(
      transform.translateX,
      this.getProgress(transform.translateX, menuWidth),
      transform.scaleX,
      transform.transformOrigin
    );
  }

  public onMenuTouchEnd() {
    this.removeMenuDragListeners();

    if (!this.isDragging || !this.isHorizontalGesture) {
      this.isDragging = false;
      this.isHorizontalGesture = false;
      // When the touch ends without a horizontal gesture, notify to restore transitions
      this.config.onUpdateTranslate(this.lastDragPosition, null);
      return;
    }

    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? Math.abs(diffX) / elapsedTime : 0;
    const menuWidth = this.config.menuWidth;
    const currentProgress = this.getProgress(this.lastDragPosition, menuWidth);

    let shouldOpen = false;
    const isRtl = this.config.isRtl();

    if (velocity > this.VELOCITY_THRESHOLD) {
      shouldOpen = isRtl ? diffX < 0 : diffX > 0;
    } else if (currentProgress > this.OPEN_THRESHOLD) {
      shouldOpen = true;
    } else if (Math.abs(diffX) > this.MIN_SWIPE_DISTANCE) {
      shouldOpen = isRtl ? diffX < 0 : diffX > 0;
    } else {
      shouldOpen = currentProgress > 0.5;
    }

    this.isDragging = false;
    this.isHorizontalGesture = false;

    if (shouldOpen) {
      this.config.onOpen();
    } else {
      this.config.onClose();
    }
    // Also notify that we are no longer dragging to restore transitions for the final animation
    this.config.onUpdateTranslate(this.lastDragPosition, null);
  }

  public handleWindowTouchStart = (event: TouchEvent) => {
    if (this.config.isOpen() || this.isDragging || this.config.isAnimating()) return;

    const touch = event.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const isRtl = this.config.isRtl();
    const isEdge = isRtl
      ? startX > window.innerWidth - this.EDGE_THRESHOLD
      : startX < this.EDGE_THRESHOLD;

    if (isEdge) {
      this.startX = startX;
      this.startY = startY;
      this.currentX = startX;
      this.currentY = startY;
      this.startTime = Date.now();
      this.isDragging = true;
      this.isHorizontalGesture = false;
      this.wasOvershooting = false;

      const menuWidth = this.config.menuWidth;
      this.initialTranslateX = isRtl ? menuWidth : -menuWidth;
      this.lastDragPosition = this.initialTranslateX;

      this.ngZone.runOutsideAngular(() => {
        document.addEventListener('touchmove', this.handleEdgeSwipeMove, { passive: false });
        document.addEventListener('touchend', this.handleEdgeSwipeEnd);
      });
    }
  };

  private handleEdgeSwipeMove = (event: TouchEvent) => {
    if (!this.isDragging || this.config.isOpen()) return;

    const touch = event.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;

    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isHorizontalGesture) {
      if (absDiffY > this.VERTICAL_LOCK_THRESHOLD && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        this.cancelEdgeSwipe();
        return;
      }

      if (absDiffX > this.HORIZONTAL_THRESHOLD && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
        this.config.onToggleHaptic();
      } else {
        return;
      }
    }

    const isRtl = this.config.isRtl();
    const isValidDirection = isRtl ? diffX < 0 : diffX > 0;

    if (this.isHorizontalGesture && isValidDirection) {
      event.preventDefault();
      event.stopPropagation();

      const menuWidth = this.config.menuWidth;
      const baseTranslate = this.initialTranslateX + diffX;
      const min = isRtl ? 0 : -menuWidth;
      const max = isRtl ? menuWidth : 0;
      const transform = this.getElasticTransform(baseTranslate, min, max, isRtl);

      const isOvershooting = transform.scaleX > 1;
      if (isOvershooting && !this.wasOvershooting) {
        this.config.onToggleHaptic();
      }
      this.wasOvershooting = isOvershooting;

      this.lastDragPosition = transform.translateX;
      this.config.onUpdateTranslate(
        transform.translateX,
        this.getProgress(transform.translateX, menuWidth),
        transform.scaleX,
        transform.transformOrigin
      );
    }
  };

  public onMenuTouchCancel() {
    this.onMenuTouchEnd();
  }

  private handleMenuDragMove = (event: TouchEvent) => {
    this.onMenuTouchMove(event);
  };

  private handleMenuDragEnd = () => {
    this.onMenuTouchEnd();
  };

  private handleMenuDragCancel = () => {
    this.onMenuTouchCancel();
  };

  private removeMenuDragListeners() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleMenuDragMove);
      document.removeEventListener('touchend', this.handleMenuDragEnd);
      document.removeEventListener('touchcancel', this.handleMenuDragCancel);
    });
  }

  private handleEdgeSwipeEnd = () => {
    if (!this.isDragging) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

    if (!this.isHorizontalGesture) {
      this.isDragging = false;
      this.isHorizontalGesture = false;
      const menuWidth = this.config.menuWidth;
      this.config.onUpdateTranslate(this.config.isRtl() ? menuWidth : -menuWidth, null);
      return;
    }

    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? Math.abs(diffX) / elapsedTime : 0;
    const menuWidth = this.config.menuWidth;
    const currentProgress = this.getProgress(this.lastDragPosition, menuWidth);

    let shouldOpen = false;

    if (velocity > this.VELOCITY_THRESHOLD) {
      shouldOpen = true;
    } else if (currentProgress > this.OPEN_THRESHOLD) {
      shouldOpen = true;
    } else if (Math.abs(diffX) > this.MIN_SWIPE_DISTANCE) {
      shouldOpen = true;
    }

    if (shouldOpen) {
      this.config.onOpen();
    } else {
      this.config.onClose();
    }
    // Also notify that we are no longer dragging to restore transitions for the final animation
    this.config.onUpdateTranslate(this.lastDragPosition, null);
  };

  private cancelEdgeSwipe() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

    this.isDragging = false;
    this.isHorizontalGesture = false;
    const menuWidth = this.config.menuWidth;
    this.config.onUpdateTranslate(this.config.isRtl() ? menuWidth : -menuWidth, null);
  }

  public destroy() {
    this.removeMenuDragListeners();
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchstart', this.handleWindowTouchStart);
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });
  }
}
