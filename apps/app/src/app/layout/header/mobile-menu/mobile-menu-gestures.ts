import { NgZone } from '@angular/core';
import {
  GESTURE_EDGE_THRESHOLD,
  GESTURE_OPEN_THRESHOLD,
  GESTURE_MIN_SWIPE_DISTANCE,
  GESTURE_VELOCITY_THRESHOLD,
  GESTURE_HORIZONTAL_THRESHOLD,
  GESTURE_VERTICAL_LOCK_THRESHOLD,
  GESTURE_VELOCITY_WINDOW_MS,
  GESTURE_ELASTIC_RESISTANCE,
  GESTURE_MAX_STRETCH_PERCENT,
} from './mobile-menu.constants';

export interface MobileMenuGestureConfig {
  maxStretchPercent?: number;
  elasticResistance?: number;

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
  /** Returns the current visual translateX of the drawer (needed to resume gestures mid-animation). */
  getCurrentTranslateX: () => number;

  onUpdateTranslate: (
    translateX: number,
    progress: number | null,
    scaleX?: number,
    transformOrigin?: string
  ) => void;
  onOpen: () => void;
  onClose: () => void;
  onToggleHaptic: () => void;
  onTrackMetric?: (metric: string, data: Record<string, unknown>) => void;
}

export class MobileMenuGestures {
  // ── Default thresholds (overridden by config) ───────────────────────────────
  private get edgeThreshold()         { return this.config.edgeThreshold         ?? GESTURE_EDGE_THRESHOLD; }
  private get openThreshold()         { return this.config.openThreshold         ?? GESTURE_OPEN_THRESHOLD; }
  private get minSwipeDistance()      { return this.config.minSwipeDistance      ?? GESTURE_MIN_SWIPE_DISTANCE; }
  private get velocityThreshold()     { return this.config.velocityThreshold     ?? GESTURE_VELOCITY_THRESHOLD; }
  private get horizontalThreshold()   { return this.config.horizontalThreshold   ?? GESTURE_HORIZONTAL_THRESHOLD; }
  private get verticalLockThreshold() { return this.config.verticalLockThreshold ?? GESTURE_VERTICAL_LOCK_THRESHOLD; }

  // ── Gesture state ────────────────────────────────────────────────────────────
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private isHorizontalGesture = false;
  private initialTranslateX = 0;
  private lastDragPosition = 0;
  private wasOvershooting = false;
  private activePointerId: number | null = null;

  // ── Instantaneous velocity buffer (P9) ───────────────────────────────────────
  private velocityBuffer: Array<{ x: number; t: number }> = [];

  // ── Elastic animation constants ──────────────────────────────────────────────
  private readonly ELASTIC_OVERSHOOT_REFERENCE_RATIO = 0.25;
  private readonly MIN_ELASTIC_EXPONENT = 1;
  private readonly MAX_ELASTIC_EXPONENT = 5;

  constructor(
    private config: MobileMenuGestureConfig,
    private ngZone: NgZone
  ) {}

  // ── Public state accessors ───────────────────────────────────────────────────
  public getIsDragging(): boolean        { return this.isDragging; }
  public getIsHorizontalGesture(): boolean { return this.isHorizontalGesture; }

  // ── Velocity helpers ─────────────────────────────────────────────────────────

  private pushVelocitySample(x: number): void {
    const now = Date.now();
    this.velocityBuffer.push({ x, t: now });
    const cutoff = now - GESTURE_VELOCITY_WINDOW_MS;
    this.velocityBuffer = this.velocityBuffer.filter(p => p.t >= cutoff);
  }

  private getInstantaneousVelocity(): number {
    if (this.velocityBuffer.length < 2) return 0;
    const first = this.velocityBuffer[0];
    const last  = this.velocityBuffer[this.velocityBuffer.length - 1];
    const dt = last.t - first.t;
    return dt > 0 ? Math.abs(last.x - first.x) / dt : 0;
  }

  private resetVelocityBuffer(): void {
    this.velocityBuffer = [];
  }

  // ── Position / progress helpers ──────────────────────────────────────────────

  private getClosedPosition(menuWidth: number): number {
    return this.config.isRtl() ? menuWidth : -menuWidth;
  }

  private getProgress(translateX: number, menuWidth: number): number {
    const closed = this.getClosedPosition(menuWidth);
    return this.config.isRtl()
      ? (closed - translateX) / menuWidth
      : (translateX - closed) / menuWidth;
  }

  // ── Elastic scale calculation ────────────────────────────────────────────────

  private calculateElasticScale(overshoot: number): number {
    const safeOvershoot = Math.max(0, overshoot);
    if (safeOvershoot === 0) return 1;

    const maxStretchPercent = Math.max(0, this.config.maxStretchPercent ?? GESTURE_MAX_STRETCH_PERCENT);
    const maxScale = 1 + maxStretchPercent / 100;

    const referenceOvershootPx = Math.max(1, this.config.menuWidth * this.ELASTIC_OVERSHOOT_REFERENCE_RATIO);
    const normalizedOvershoot = Math.min(safeOvershoot / referenceOvershootPx, 1);

    const rawResistance = this.config.elasticResistance ?? GESTURE_ELASTIC_RESISTANCE;
    const safeResistance = Number.isFinite(rawResistance) ? Number(rawResistance) : GESTURE_ELASTIC_RESISTANCE;
    const normalizedResistance = Math.min(100, Math.max(0, safeResistance)) / 100;
    const exponent =
      this.MIN_ELASTIC_EXPONENT +
      normalizedResistance * (this.MAX_ELASTIC_EXPONENT - this.MIN_ELASTIC_EXPONENT);

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
      finalTranslateX = max;
      scaleX = this.calculateElasticScale(translateX - max);
      transformOrigin = 'left';
    } else if (translateX < min) {
      finalTranslateX = min;
      scaleX = this.calculateElasticScale(min - translateX);
      transformOrigin = 'right';
    }

    return { translateX: finalTranslateX, scaleX, transformOrigin };
  }

  // ── Menu drag (drawer is open / mid-animation) ───────────────────────────────

  public onMenuPointerDown(event: PointerEvent): void {
    if (this.activePointerId !== null) return;
    // Allow interaction when open OR animating (supports interrupting a closing animation — P3)
    if (!this.config.isOpen() && !this.config.isAnimating()) return;

    event.stopPropagation();
    this.activePointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.wasOvershooting = false;
    this.resetVelocityBuffer();

    // Capture current visual position so gesture resumes from mid-animation offset (P3)
    this.initialTranslateX = this.config.getCurrentTranslateX();
    this.lastDragPosition = this.initialTranslateX;

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('pointermove', this.handleMenuDragMove);
      document.addEventListener('pointerup',   this.handleMenuDragEnd);
      document.addEventListener('pointercancel', this.handleMenuDragCancel);
    });
  }

  public onMenuPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    // Allow movement when open OR animating (P3 — supports interrupting close)
    if (!this.config.isOpen() && !this.config.isAnimating()) return;

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

    this.pushVelocitySample(event.clientX);

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

  public onMenuPointerEnd(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.removeMenuDragListeners();

    if (!this.isDragging || !this.isHorizontalGesture) {
      this.resetDragState();
      this.config.onUpdateTranslate(this.lastDragPosition, null);
      this.trackMetric('gesture_cancel', { source: 'drawer' });
      return;
    }

    const diffX      = this.currentX - this.startX;
    const velocity   = this.getInstantaneousVelocity(); // instantaneous (P9)
    const menuWidth  = this.config.menuWidth;
    const progress   = this.getProgress(this.lastDragPosition, menuWidth);
    const isRtl      = this.config.isRtl();

    let shouldStayOpen: boolean;

    if (velocity > this.velocityThreshold) {
      // Fast swipe: direction determines intent
      shouldStayOpen = isRtl ? diffX < 0 : diffX > 0;
    } else if (progress > this.openThreshold) {
      shouldStayOpen = true;
    } else if (Math.abs(diffX) > this.minSwipeDistance) {
      shouldStayOpen = isRtl ? diffX < 0 : diffX > 0;
    } else {
      shouldStayOpen = progress > 0.5;
    }

    this.resetDragState();
    this.config.onUpdateTranslate(this.lastDragPosition, null);

    if (shouldStayOpen) {
      this.config.onOpen();
      this.trackMetric('gesture_complete', { action: 'stay_open', source: 'drawer' });
    } else {
      this.config.onClose();
      this.trackMetric('gesture_complete', { action: 'close', source: 'drawer' });
    }
  }

  // P12 — on system cancel, revert to last stable state instead of applying gesture logic
  public onMenuPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.removeMenuDragListeners();

    const wasOpen = this.config.isOpen();
    this.resetDragState();
    this.config.onUpdateTranslate(this.lastDragPosition, null);

    if (wasOpen) {
      this.config.onOpen();
    } else {
      this.config.onClose();
    }
    this.trackMetric('gesture_cancel', { source: 'system_interrupt' });
  }

  // ── Edge swipe (menu is fully closed) ────────────────────────────────────────

  public handleWindowPointerDown = (event: PointerEvent): void => {
    if (this.config.isOpen() || this.isDragging || this.config.isAnimating() || this.activePointerId !== null) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const isRtl  = this.config.isRtl();
    const isEdge = isRtl
      ? startX > window.innerWidth - this.edgeThreshold
      : startX < this.edgeThreshold;

    if (!isEdge) return;

    this.activePointerId = event.pointerId;
    this.startX  = startX;
    this.startY  = startY;
    this.currentX = startX;
    this.currentY = startY;
    this.isDragging = true;
    this.isHorizontalGesture = false;
    this.wasOvershooting = false;
    this.resetVelocityBuffer();

    const menuWidth = this.config.menuWidth;
    this.initialTranslateX = isRtl ? menuWidth : -menuWidth;
    this.lastDragPosition  = this.initialTranslateX;

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('pointermove',   this.handleEdgeSwipeMove);
      document.addEventListener('pointerup',     this.handleEdgeSwipeEnd);
      // R2 — use a dedicated cancel handler that always reverts to closed instead
      // of applying velocity/progress logic (mirrors P12 fix for drawer drag).
      document.addEventListener('pointercancel', this.handleEdgeSwipeCancel);
    });
  };

  private handleEdgeSwipeMove = (event: PointerEvent): void => {
    if (!this.isDragging || this.config.isOpen() || event.pointerId !== this.activePointerId) return;

    this.currentX = event.clientX;
    this.currentY = event.clientY;

    const diffX    = this.currentX - this.startX;
    const diffY    = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isHorizontalGesture) {
      if (absDiffY > this.verticalLockThreshold && absDiffY > absDiffX) {
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

    const isRtl           = this.config.isRtl();
    const isValidDirection = isRtl ? diffX < 0 : diffX > 0;
    if (!this.isHorizontalGesture || !isValidDirection) return;

    this.pushVelocitySample(event.clientX);

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
  };

  private handleEdgeSwipeEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointermove',   this.handleEdgeSwipeMove);
      document.removeEventListener('pointerup',     this.handleEdgeSwipeEnd);
      document.removeEventListener('pointercancel', this.handleEdgeSwipeCancel);
    });

    if (!this.isDragging || !this.isHorizontalGesture) {
      const menuWidth = this.config.menuWidth;
      const closedPos = this.config.isRtl() ? menuWidth : -menuWidth;
      this.resetDragState();
      this.config.onUpdateTranslate(closedPos, null);
      this.trackMetric('gesture_cancel', { source: 'edge' });
      return;
    }

    const diffX    = this.currentX - this.startX;
    const velocity = this.getInstantaneousVelocity(); // instantaneous (P9)
    const menuWidth  = this.config.menuWidth;
    const progress   = this.getProgress(this.lastDragPosition, menuWidth);

    const shouldOpen =
      velocity > this.velocityThreshold ||
      progress > this.openThreshold ||
      Math.abs(diffX) > this.minSwipeDistance;

    const lastPos = this.lastDragPosition;
    this.resetDragState();
    this.config.onUpdateTranslate(lastPos, null);

    if (shouldOpen) {
      this.config.onOpen();
      this.trackMetric('gesture_complete', { action: 'open', source: 'edge' });
    } else {
      this.config.onClose();
      this.trackMetric('gesture_complete', { action: 'close_abort', source: 'edge' });
    }
  };

  private cancelEdgeSwipe(): void {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointermove',   this.handleEdgeSwipeMove);
      document.removeEventListener('pointerup',     this.handleEdgeSwipeEnd);
      document.removeEventListener('pointercancel', this.handleEdgeSwipeCancel);
    });

    const menuWidth = this.config.menuWidth;
    const closedPos = this.config.isRtl() ? menuWidth : -menuWidth;
    this.resetDragState();
    this.config.onUpdateTranslate(closedPos, null);
    this.trackMetric('gesture_cancel', { source: 'edge_lock' });
  }

  // R2 — on system cancel (incoming call, app switch, lost pointer) during an
  // edge swipe, always revert to the stable closed position. Never apply
  // velocity/progress logic on an involuntary interruption.
  private handleEdgeSwipeCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointermove',   this.handleEdgeSwipeMove);
      document.removeEventListener('pointerup',     this.handleEdgeSwipeEnd);
      document.removeEventListener('pointercancel', this.handleEdgeSwipeCancel);
    });

    const menuWidth = this.config.menuWidth;
    const closedPos = this.config.isRtl() ? menuWidth : -menuWidth;
    this.resetDragState();
    this.config.onUpdateTranslate(closedPos, null);
    this.config.onClose();
    this.trackMetric('gesture_cancel', { source: 'edge_system_interrupt' });
  };

  // ── Internal drag listener management ───────────────────────────────────────

  private handleMenuDragMove   = (e: PointerEvent) => this.onMenuPointerMove(e);
  private handleMenuDragEnd    = (e: PointerEvent) => this.onMenuPointerEnd(e);
  private handleMenuDragCancel = (e: PointerEvent) => this.onMenuPointerCancel(e);

  private removeMenuDragListeners(): void {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointermove',   this.handleMenuDragMove);
      document.removeEventListener('pointerup',     this.handleMenuDragEnd);
      document.removeEventListener('pointercancel', this.handleMenuDragCancel);
    });
  }

  private resetDragState(): void {
    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.activePointerId = null;
    this.resetVelocityBuffer();
  }

  // ── Analytics ────────────────────────────────────────────────────────────────

  private trackMetric(metric: string, data: Record<string, unknown>): void {
    this.config.onTrackMetric?.(metric, data);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  public destroy(): void {
    this.removeMenuDragListeners();
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('pointerdown',   this.handleWindowPointerDown);
      document.removeEventListener('pointermove',   this.handleEdgeSwipeMove);
      document.removeEventListener('pointerup',     this.handleEdgeSwipeEnd);
      // R2 — cancel and system-interrupt handlers are separate references
      document.removeEventListener('pointercancel', this.handleEdgeSwipeCancel);
    });
  }
}
