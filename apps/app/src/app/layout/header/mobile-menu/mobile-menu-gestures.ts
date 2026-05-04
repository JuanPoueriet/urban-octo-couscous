import { NgZone } from '@angular/core';

export interface MobileMenuGestureConfig {
  menuWidth: number;
  isRtl: () => boolean;
  isOpen: () => boolean;
  isAnimating: () => boolean;
  onUpdateTranslate: (translateX: number, progress: number | null) => void;
  onDraggingChange: (isDragging: boolean) => void;
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
  private readonly MAX_OVERDRAG = 45;
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
        this.config.onDraggingChange(true);
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

    const isRtl = this.config.isRtl();
    const menuWidth = this.config.menuWidth;
    let translateX = diffX;

    // Apply resistance logic for overdrag
    if (!isRtl) {
      // Boundaries for LTR: open=0, closed=-menuWidth
      if (translateX > 0) {
        // Stretching beyond fully open
        translateX = this.applyRubberBand(translateX);
      } else if (translateX < -menuWidth) {
        // Stretching beyond fully closed
        const overdrag = -menuWidth - translateX;
        translateX = -menuWidth - this.applyRubberBand(overdrag);
      }
    } else {
      // Boundaries for RTL: open=0, closed=menuWidth
      if (translateX < 0) {
        // Stretching beyond fully open
        translateX = -this.applyRubberBand(Math.abs(translateX));
      } else if (translateX > menuWidth) {
        // Stretching beyond fully closed
        const overdrag = translateX - menuWidth;
        translateX = menuWidth + this.applyRubberBand(overdrag);
      }
    }

    this.lastDragPosition = translateX;
    const progress = isRtl
      ? (menuWidth - translateX) / menuWidth
      : (translateX + menuWidth) / menuWidth;

    this.config.onUpdateTranslate(translateX, progress);
  }

  private applyRubberBand(overdrag: number): number {
    // Standard rubber-band effect using atan for a natural limit
    // Limits at approx 50px-60px
    return Math.atan(overdrag / 60) * 55;
  }

  public onMenuTouchEnd() {
    const wasDragging = this.isDragging;

    if (!this.isDragging || !this.isHorizontalGesture) {
      this.isDragging = false;
      this.isHorizontalGesture = false;
      if (wasDragging) {
        this.config.onDraggingChange(false);
      }
      return;
    }

    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.config.onDraggingChange(false);

    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? Math.abs(diffX) / elapsedTime : 0;
    const menuWidth = this.config.menuWidth;
    const isRtl = this.config.isRtl();
    const currentProgress = isRtl
      ? (menuWidth - this.lastDragPosition) / menuWidth
      : (this.lastDragPosition + menuWidth) / menuWidth;

    let shouldOpen = false;

    if (velocity > this.VELOCITY_THRESHOLD) {
      shouldOpen = isRtl ? diffX < 0 : diffX > 0;
    } else if (currentProgress > this.OPEN_THRESHOLD) {
      shouldOpen = true;
    } else if (Math.abs(diffX) > this.MIN_SWIPE_DISTANCE) {
      shouldOpen = isRtl ? diffX < 0 : diffX > 0;
    } else {
      shouldOpen = currentProgress > 0.5;
    }

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
      this.lastDragPosition = isRtl ? this.config.menuWidth : -this.config.menuWidth;
      this.config.onDraggingChange(true);

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
      let translateX = isRtl ? menuWidth + diffX : -menuWidth + diffX;

      // Apply resistance logic for overdrag during opening
      if (!isRtl) {
        if (translateX > 0) {
          translateX = this.applyRubberBand(translateX);
        }
      } else {
        if (translateX < 0) {
          translateX = -this.applyRubberBand(Math.abs(translateX));
        }
      }

      this.lastDragPosition = translateX;
      const progress = isRtl
        ? (menuWidth - translateX) / menuWidth
        : (translateX + menuWidth) / menuWidth;

      this.config.onUpdateTranslate(translateX, progress);
    }
  };

  private handleEdgeSwipeEnd = () => {
    if (!this.isDragging) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

    this.isDragging = false;
    this.config.onDraggingChange(false);

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
    const isRtl = this.config.isRtl();
    const currentProgress = isRtl
      ? (menuWidth - this.lastDragPosition) / menuWidth
      : (this.lastDragPosition + menuWidth) / menuWidth;

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
    this.config.onDraggingChange(false);
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
