import { NgZone } from '@angular/core';

export interface MobileMenuGestureConfig {
  menuWidth: number;
  isRtl: () => boolean;
  isOpen: () => boolean;
  isAnimating: () => boolean;
  onUpdateTranslate: (translateX: number, progress: number | null) => void;
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
  private readonly MAX_OVERDRAG = 40;
  private readonly OVERDRAG_RESISTANCE = 0.28;
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
  private lastDragPosition = 0;

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


  private getClosedPosition(menuWidth: number): number {
    return this.config.isRtl() ? menuWidth : -menuWidth;
  }

  private getProgress(translateX: number, menuWidth: number): number {
    const closed = this.getClosedPosition(menuWidth);
    const progress = this.config.isRtl()
      ? (closed - translateX) / menuWidth
      : (translateX - closed) / menuWidth;

    return Math.max(0, Math.min(1, progress));
  }

  private applyOverdragResistance(value: number, min: number, max: number): number {
    if (value < min) {
      return min + (value - min) * this.OVERDRAG_RESISTANCE;
    }

    if (value > max) {
      return max + (value - max) * this.OVERDRAG_RESISTANCE;
    }

    return value;
  }

  private getDragBounds(menuWidth: number): { min: number; max: number } {
    return this.config.isRtl()
      ? { min: -this.MAX_OVERDRAG, max: menuWidth + this.MAX_OVERDRAG }
      : { min: -menuWidth - this.MAX_OVERDRAG, max: this.MAX_OVERDRAG };
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

    this.lastDragPosition = 0;
    this.config.onUpdateTranslate(this.lastDragPosition, this.getProgress(this.lastDragPosition, this.config.menuWidth));
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
    const { min, max } = this.getDragBounds(menuWidth);
    const translateX = this.applyOverdragResistance(diffX, min, max);

    this.lastDragPosition = translateX;
    this.config.onUpdateTranslate(translateX, this.getProgress(translateX, menuWidth));
  }

  public onMenuTouchEnd() {
    if (!this.isDragging || !this.isHorizontalGesture) {
      this.isDragging = false;
      this.isHorizontalGesture = false;
      return;
    }

    this.isDragging = false;
    this.isHorizontalGesture = false;

    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const signedVelocity = elapsedTime > 0 ? diffX / elapsedTime : 0;
    const absVelocity = Math.abs(signedVelocity);
    const menuWidth = this.config.menuWidth;
    const currentProgress = this.getProgress(this.lastDragPosition, menuWidth);
    const isRtl = this.config.isRtl();
    const velocityOpens = isRtl ? signedVelocity < -this.VELOCITY_THRESHOLD : signedVelocity > this.VELOCITY_THRESHOLD;
    const velocityCloses = isRtl ? signedVelocity > this.VELOCITY_THRESHOLD : signedVelocity < -this.VELOCITY_THRESHOLD;
    const shouldOpen = absVelocity > this.VELOCITY_THRESHOLD
      ? velocityOpens && !velocityCloses
      : currentProgress >= (1 - this.OPEN_THRESHOLD);

    if (shouldOpen) {
      this.config.onOpen();
    } else {
      this.config.onClose();
    }
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
      const baseTranslate = isRtl ? menuWidth + diffX : -menuWidth + diffX;
      const { min, max } = this.getDragBounds(menuWidth);
      const translateX = this.applyOverdragResistance(baseTranslate, min, max);

      this.lastDragPosition = translateX;
      this.config.onUpdateTranslate(translateX, this.getProgress(translateX, menuWidth));
    }
  };

  public onMenuTouchCancel() {
    this.onMenuTouchEnd();
  }

  private handleEdgeSwipeEnd = () => {
    if (!this.isDragging) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

    this.isDragging = false;

    if (!this.isHorizontalGesture) {
      this.isHorizontalGesture = false;
      const menuWidth = this.config.menuWidth;
      this.config.onUpdateTranslate(this.config.isRtl() ? menuWidth : -menuWidth, 0);
      return;
    }

    this.isHorizontalGesture = false;
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
  };

  private cancelEdgeSwipe() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

    this.isDragging = false;
    this.isHorizontalGesture = false;
    const menuWidth = this.config.menuWidth;
    this.config.onUpdateTranslate(this.config.isRtl() ? menuWidth : -menuWidth, 0);
  }

  public destroy() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchstart', this.handleWindowTouchStart);
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });
  }
}
