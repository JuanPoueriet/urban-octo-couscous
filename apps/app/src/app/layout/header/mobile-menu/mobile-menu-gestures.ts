import { NgZone } from '@angular/core';

export interface MobileMenuGestureConfig {
  /** Percentage cap for elastic X scale (e.g. 8 => scaleX <= 1.08). */
  maxStretchPercent?: number;
  /** Elastic resistance strength (0-100). Higher = harder near the max stretch cap. */
  elasticResistance?: number;

  // Customizable thresholds
  edgeThreshold?: number;
  openThreshold?: number;
  minSwipeDistance?: number;
  velocityThreshold?: number;
  horizontalThreshold?: number;
  verticalLockThreshold?: number;

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
  onTrackMetric?: (metric: string, data: any) => void;
}

export class MobileMenuGestures {
  // Configuración de gestos (defaults)
  private readonly DEFAULT_EDGE_THRESHOLD = 20;
  private readonly DEFAULT_OPEN_THRESHOLD = 0.3;
  private readonly DEFAULT_MIN_SWIPE_DISTANCE = 30;
  private readonly DEFAULT_VELOCITY_THRESHOLD = 0.3;
  private readonly DEFAULT_HORIZONTAL_THRESHOLD = 10;
  private readonly DEFAULT_VERTICAL_LOCK_THRESHOLD = 10;
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
  private activePointerId: number | null = null;

  constructor(
    private config: MobileMenuGestureConfig,
    private ngZone: NgZone
  ) {}

  // Threshold getters with fallback to defaults
  private get edgeThreshold(): number { return this.config.edgeThreshold ?? this.DEFAULT_EDGE_THRESHOLD; }
  private get openThreshold(): number { return this.config.openThreshold ?? this.DEFAULT_OPEN_THRESHOLD; }
  private get minSwipeDistance(): number { return this.config.minSwipeDistance ?? this.DEFAULT_MIN_SWIPE_DISTANCE; }
  private get velocityThreshold(): number { return this.config.velocityThreshold ?? this.DEFAULT_VELOCITY_THRESHOLD; }
  private get horizontalThreshold(): number { return this.config.horizontalThreshold ?? this.DEFAULT_HORIZONTAL_THRESHOLD; }
  private get verticalLockThreshold(): number { return this.config.verticalLockThreshold ?? this.DEFAULT_VERTICAL_LOCK_THRESHOLD; }

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

    return progress;
  }

  private readonly DEFAULT_MAX_STRETCH_PERCENT = 4;
  private readonly ELASTIC_OVERSHOOT_REFERENCE_RATIO = 0.25;
  private readonly DEFAULT_ELASTIC_RESISTANCE = 50;
  private readonly MIN_ELASTIC_EXPONENT = 1;
  private readonly MAX_ELASTIC_EXPONENT = 5;

  private calculateElasticScale(overshoot: number): number {
    const safeOvershoot = Math.max(0, overshoot);
    if (safeOvershoot === 0) return 1;

    const maxStretchPercent = Math.max(0, this.config.maxStretchPercent ?? this.DEFAULT_MAX_STRETCH_PERCENT);
    const maxScale = 1 + maxStretchPercent / 100;

    const referenceOvershootPx = Math.max(1, this.config.menuWidth * this.ELASTIC_OVERSHOOT_REFERENCE_RATIO);
    const normalizedOvershoot = Math.min(safeOvershoot / referenceOvershootPx, 1);

    const safeResistanceInput = Number.isFinite(this.config.elasticResistance)
      ? Number(this.config.elasticResistance)
      : this.DEFAULT_ELASTIC_RESISTANCE;
    const normalizedResistance = Math.min(100, Math.max(0, safeResistanceInput)) / 100;
    const exponent =
      this.MIN_ELASTIC_EXPONENT +
      normalizedResistance * (this.MAX_ELASTIC_EXPONENT - this.MIN_ELASTIC_EXPONENT);

    // Ease-out damping: near max stretch, each extra pixel contributes less.
    const damped = 1 - Math.pow(1 - normalizedOvershoot, exponent);
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

  public onMenuPointerDown(event: PointerEvent) {
    if (!this.config.isOpen() || this.config.isAnimating() || this.activePointerId !== null) return;

    event.stopPropagation();
    this.activePointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
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
      document.addEventListener('pointermove', this.handleMenuDragMove);
      document.addEventListener('pointerup', this.handleMenuDragEnd);
      document.addEventListener('pointercancel', this.handleMenuDragCancel);
    });
  }

  public onMenuPointerMove(event: PointerEvent) {
    if (!this.config.isOpen() || event.pointerId !== this.activePointerId) return;

    this.currentX = event.clientX;
    this.currentY = event.clientY;

    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isDragging && !this.isHorizontalGesture) {
      if (absDiffY > this.verticalLockThreshold && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        return;
      }

      if (absDiffX > this.horizontalThreshold && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
        this.isDragging = true;
        this.config.onToggleHaptic();
      } else {
        return;
      }
    }

    if (!this.isHorizontalGesture || !this.isDragging) return;

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

  public onMenuPointerEnd(event: PointerEvent) {
    if (event.pointerId !== this.activePointerId) return;
    this.removeMenuDragListeners();

    if (!this.isDragging || !this.isHorizontalGesture) {
      this.isDragging = false;
      this.isHorizontalGesture = false;
      this.activePointerId = null;
      // When the gesture ends without reaching threshold, notify to restore transitions
      this.config.onUpdateTranslate(this.lastDragPosition, null);
      this.trackMetric('gesture_cancel', { source: 'drawer' });
      return;
    }

    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? Math.abs(diffX) / elapsedTime : 0;
    const menuWidth = this.config.menuWidth;
    const currentProgress = this.getProgress(this.lastDragPosition, menuWidth);

    let shouldStayOpen = false;
    const isRtl = this.config.isRtl();

    if (velocity > this.velocityThreshold) {
      // In LTR: diffX < 0 is closing (moving left).
      // In RTL: diffX > 0 is closing (moving right).
      // If we are swipe-closing with high velocity, shouldStayOpen should be false.
      shouldStayOpen = isRtl ? diffX < 0 : diffX > 0;
    } else if (currentProgress > this.openThreshold) {
      shouldStayOpen = true;
    } else if (Math.abs(diffX) > this.minSwipeDistance) {
      shouldStayOpen = isRtl ? diffX < 0 : diffX > 0;
    } else {
      shouldStayOpen = currentProgress > 0.5;
    }

    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.activePointerId = null;

    if (shouldStayOpen) {
      this.config.onOpen();
      this.trackMetric('gesture_complete', { action: 'stay_open', source: 'drawer' });
    } else {
      this.config.onClose();
      this.trackMetric('gesture_complete', { action: 'close', source: 'drawer' });
    }
    // Also notify that we are no longer dragging to restore transitions for the final animation
    this.config.onUpdateTranslate(this.lastDragPosition, null);
  }

  public handleWindowPointerDown = (event: PointerEvent) => {
    if (this.config.isOpen() || this.isDragging || this.config.isAnimating() || this.activePointerId !== null) return;

    const startX = event.clientX;
    const startY = event.clientY;

    const isRtl = this.config.isRtl();
    const isEdge = isRtl
      ? startX > window.innerWidth - this.edgeThreshold
      : startX < this.edgeThreshold;

    if (isEdge) {
      this.activePointerId = event.pointerId;
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
        document.addEventListener('pointermove', this.handleEdgeSwipeMove);
        document.addEventListener('pointerup', this.handleEdgeSwipeEnd);
        document.addEventListener('pointercancel', this.handleEdgeSwipeEnd);
      });
    }
  };

  private handleEdgeSwipeMove = (event: PointerEvent) => {
    if (!this.isDragging || this.config.isOpen() || event.pointerId !== this.activePointerId) return;

    this.currentX = event.clientX;
    this.currentY = event.clientY;

    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isHorizontalGesture) {
      if (absDiffY > this.verticalLockThreshold && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        this.cancelEdgeSwipe();
        return;
      }

      if (absDiffX > this.horizontalThreshold && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
        this.config.onToggleHaptic();
      } else {
        return;
      }
    }

    const isRtl = this.config.isRtl();
    const isValidDirection = isRtl ? diffX < 0 : diffX > 0;

    if (this.isHorizontalGesture && isValidDirection) {

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

  public onMenuPointerCancel(event: PointerEvent) {
    this.onMenuPointerEnd(event);
  }

  private handleMenuDragMove = (event: PointerEvent) => {
    this.onMenuPointerMove(event);
  };

  private handleMenuDragEnd = (event: PointerEvent) => {
    this.onMenuPointerEnd(event);
  };

  private handleMenuDragCancel = (event: PointerEvent) => {
    this.onMenuPointerCancel(event);
  };

  private removeMenuDragListeners() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointermove', this.handleMenuDragMove);
      document.removeEventListener('pointerup', this.handleMenuDragEnd);
      document.removeEventListener('pointercancel', this.handleMenuDragCancel);
    });
  }

  private handleEdgeSwipeEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.activePointerId) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointermove', this.handleEdgeSwipeMove);
      document.removeEventListener('pointerup', this.handleEdgeSwipeEnd);
      document.removeEventListener('pointercancel', this.handleEdgeSwipeEnd);
    });

    if (!this.isDragging || !this.isHorizontalGesture) {
      this.isDragging = false;
      this.isHorizontalGesture = false;
      this.activePointerId = null;
      const menuWidth = this.config.menuWidth;
      this.config.onUpdateTranslate(this.config.isRtl() ? menuWidth : -menuWidth, null);
      this.trackMetric('gesture_cancel', { source: 'edge' });
      return;
    }

    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? Math.abs(diffX) / elapsedTime : 0;
    const menuWidth = this.config.menuWidth;
    const currentProgress = this.getProgress(this.lastDragPosition, menuWidth);

    let shouldOpen = false;

    if (velocity > this.velocityThreshold) {
      shouldOpen = true;
    } else if (currentProgress > this.openThreshold) {
      shouldOpen = true;
    } else if (Math.abs(diffX) > this.minSwipeDistance) {
      shouldOpen = true;
    }

    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.activePointerId = null;

    if (shouldOpen) {
      this.config.onOpen();
      this.trackMetric('gesture_complete', { action: 'open', source: 'edge' });
    } else {
      this.config.onClose();
      this.trackMetric('gesture_complete', { action: 'close_abort', source: 'edge' });
    }
    // Also notify that we are no longer dragging to restore transitions for the final animation
    this.config.onUpdateTranslate(this.lastDragPosition, null);
  };

  private cancelEdgeSwipe() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointermove', this.handleEdgeSwipeMove);
      document.removeEventListener('pointerup', this.handleEdgeSwipeEnd);
      document.removeEventListener('pointercancel', this.handleEdgeSwipeEnd);
    });

    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.activePointerId = null;
    const menuWidth = this.config.menuWidth;
    this.config.onUpdateTranslate(this.config.isRtl() ? menuWidth : -menuWidth, null);
    this.trackMetric('gesture_cancel', { source: 'edge_lock' });
  }

  private trackMetric(metric: string, data: any) {
    if (this.config.onTrackMetric) {
      this.config.onTrackMetric(metric, data);
    }
  }

  public destroy() {
    this.removeMenuDragListeners();
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointerdown', this.handleWindowPointerDown);
      document.removeEventListener('pointermove', this.handleEdgeSwipeMove);
      document.removeEventListener('pointerup', this.handleEdgeSwipeEnd);
      document.removeEventListener('pointercancel', this.handleEdgeSwipeEnd);
    });
  }
}
