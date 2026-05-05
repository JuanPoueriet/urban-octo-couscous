import { NgZone } from '@angular/core';
import { GestureBusService, GestureHandler } from '@core/services/gesture-bus.service';
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
  onStopTransition: () => void;
  onToggleHaptic: () => void;
  onTrackMetric?: (metric: string, data: Record<string, unknown>) => void;
}

export class MobileMenuGestures implements GestureHandler {
  public name = 'MobileMenu';
  public priority = 100; // High priority for mobile menu
  // ── Adaptive thresholds (Problem 3) ──────────────────────────────────────────

  private get viewportWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1024;
  }

  private get dpr(): number {
    return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  }

  private get edgeThreshold(): number {
    // S3 — Adaptive edge threshold: larger on small screens, adjusted by DPI
    const base = this.config.edgeThreshold ?? GESTURE_EDGE_THRESHOLD;
    const factor = this.viewportWidth < 360 ? 1.2 : 1.0;
    return base * factor;
  }

  private get openThreshold(): number {
    return this.config.openThreshold ?? GESTURE_OPEN_THRESHOLD;
  }

  private get minSwipeDistance(): number {
    // S3 — Distance scales with DPI to maintain feel across resolutions
    const base = this.config.minSwipeDistance ?? GESTURE_MIN_SWIPE_DISTANCE;
    return base * (this.dpr > 1.5 ? 0.8 : 1.0);
  }

  private get velocityThreshold(): number {
    // S3 — Higher velocity threshold on higher DPI screens to reduce accidental triggers
    const base = this.config.velocityThreshold ?? GESTURE_VELOCITY_THRESHOLD;
    return base * (this.dpr > 1.5 ? 1.15 : 1.0);
  }

  private get horizontalThreshold(): number {
    return this.config.horizontalThreshold ?? GESTURE_HORIZONTAL_THRESHOLD;
  }

  private get verticalLockThreshold(): number {
    return this.config.verticalLockThreshold ?? GESTURE_VERTICAL_LOCK_THRESHOLD;
  }

  private get tapThreshold(): number {
    // S3 — Adaptive tap threshold: slightly larger on high-DPI screens to reduce false negatives
    return 10 * (this.dpr > 1.5 ? 1.5 : 1.0);
  }

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

  private gestureBusUnregister: (() => void) | null = null;

  constructor(
    private config: MobileMenuGestureConfig,
    private ngZone: NgZone,
    private gestureBus: GestureBusService
  ) {
    this.gestureBusUnregister = this.gestureBus.registerHandler(this);
  }

  // ── Public state accessors ───────────────────────────────────────────────────
  public getIsDragging(): boolean        { return this.isDragging; }
  public getIsHorizontalGesture(): boolean { return this.isHorizontalGesture; }

  // ── Velocity helpers ─────────────────────────────────────────────────────────

  private pushVelocitySample(x: number): void {
    const now = performance.now();
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

  private overlayDownX = 0;
  private overlayDownY = 0;

  public onPointerDown(event: PointerEvent): boolean {
    if (this.activePointerId !== null) return false;

    // 0. Check for Overlay Interaction (if open)
    if (this.config.isOpen()) {
      const target = event.target as HTMLElement;
      if (target?.classList.contains('mobile-menu-overlay')) {
        this.startOverlayInteraction(event);
        return true;
      }
    }

    // 1. Check for Edge Swipe (if enabled and closed)
    const isRtl = this.config.isRtl();
    const isClosed = !this.config.isOpen() && !this.config.isAnimating();

    if (this.isEdgeSwipeEnabled && isClosed) {
      const isEdge = isRtl
        ? event.clientX > window.innerWidth - this.edgeThreshold
        : event.clientX < this.edgeThreshold;

      if (isEdge) {
        this.startEdgeSwipe(event);
        return true;
      }
    }

    // 2. Check for Drawer Drag (if open or animating)
    const isOpenOrAnimating = this.config.isOpen() || this.config.isAnimating();
    if (isOpenOrAnimating) {
      // Check if click is within the drawer or on the overlay (if we want to allow dragging from overlay)
      // For now, let's assume it only captures if it's within the menu width or we are already open.
      // Actually, if it's open, we want it to capture if it's on the drawer.
      // But the GestureBus will call this for EVERY pointerdown.

      // Let's use a simpler heuristic: if it's open, and it's a horizontal start, we capture.
      // Or we can check if the target is inside the menu.
      const menuWidth = this.config.menuWidth;
      const isInsideMenu = isRtl
        ? event.clientX > window.innerWidth - menuWidth
        : event.clientX < menuWidth;

      if (isInsideMenu || this.config.isOpen()) {
        this.startMenuDrag(event);
        return true;
      }
    }

    return false;
  }

  private startOverlayInteraction(event: PointerEvent): void {
    this.config.onStopTransition();
    this.activePointerId = event.pointerId;
    this.overlayDownX = event.clientX;
    this.overlayDownY = event.clientY;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.isOverlaySwipeActive = true;
    this.resetVelocityBuffer();
  }

  private isOverlaySwipeActive = false;

  private startMenuDrag(event: PointerEvent): void {
    this.config.onStopTransition();
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
    this.isEdgeSwipeActive = false;
  }

  private isEdgeSwipeActive = false;

  private startEdgeSwipe(event: PointerEvent): void {
    this.activePointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.isDragging = true;
    this.isHorizontalGesture = false;
    this.wasOvershooting = false;
    this.resetVelocityBuffer();

    const menuWidth = this.config.menuWidth;
    this.initialTranslateX = this.config.isRtl() ? menuWidth : -menuWidth;
    this.lastDragPosition = this.initialTranslateX;
    this.isEdgeSwipeActive = true;
  }

  public onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    if (this.isEdgeSwipeActive) {
      this.handleEdgeSwipeMove(event);
    } else if (this.isOverlaySwipeActive) {
      this.handleOverlayMove(event);
    } else {
      this.handleMenuDragMove(event);
    }
  }

  private handleOverlayMove(event: PointerEvent): void {
    this.currentX = event.clientX;
    this.currentY = event.clientY;

    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isDragging && !this.isHorizontalGesture) {
      if (absDiffY > this.verticalLockThreshold && absDiffY > absDiffX) {
        return;
      }
      if (absDiffX > this.horizontalThreshold && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
        this.isDragging = true;
        this.config.onToggleHaptic();
      }
    }

    if (this.isDragging && this.isHorizontalGesture) {
      this.pushVelocitySample(event.clientX);
      // We could also update the drawer position here for a "parallax" feel
      // For now, just tracking the gesture for the end decision.
    }
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

  public onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    if (this.isEdgeSwipeActive) {
      this.handleEdgeSwipeEnd(event);
    } else if (this.isOverlaySwipeActive) {
      this.handleOverlayEnd(event);
    } else {
      this.handleMenuDragEnd(event);
    }
  }

  private handleOverlayEnd(event: PointerEvent): void {
    const diffX = event.clientX - this.overlayDownX;
    const diffY = event.clientY - this.overlayDownY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    const velocity = this.getInstantaneousVelocity();
    const isRtl = this.config.isRtl();

    // P2 — Swipe to close on overlay: require directionality for both velocity and distance
    const isValidDirection = isRtl ? diffX > 0 : diffX < 0;
    const isSwipeToClose =
      this.isDragging &&
      this.isHorizontalGesture &&
      isValidDirection &&
      (velocity > this.velocityThreshold || absDiffX > this.minSwipeDistance);

    if (isSwipeToClose) {
      this.config.onClose();
      this.trackMetric('gesture_complete', { action: 'close', source: 'overlay_swipe' });
    } else if (
      !this.isHorizontalGesture &&
      absDiffX < this.tapThreshold &&
      absDiffY < this.tapThreshold
    ) {
      // P3 — Adaptive tap to close; ignore if it was a horizontal gesture attempt
      this.config.onClose();
      this.trackMetric('gesture_complete', { action: 'close', source: 'overlay_tap' });
    }

    this.resetDragState();
    this.isOverlaySwipeActive = false;
  }

  public onMenuPointerEnd(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

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
  public onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    if (this.isEdgeSwipeActive) {
      this.handleEdgeSwipeCancel(event);
    } else if (this.isOverlaySwipeActive) {
      this.resetDragState();
      this.isOverlaySwipeActive = false;
    } else {
      this.handleMenuDragCancel(event);
    }
  }

  public onMenuPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

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

  private isEdgeSwipeEnabled = false;

  public setEdgeSwipeEnabled(enabled: boolean): void {
    this.isEdgeSwipeEnabled = enabled;
  }

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
    if (this.gestureBusUnregister) {
      this.gestureBusUnregister();
      this.gestureBusUnregister = null;
    }
  }
}
