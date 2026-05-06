import { NgZone } from '@angular/core';
import { GestureBusService, GestureHandler } from '@core/services/gesture-bus.service';
import {
  GESTURE_EDGE_THRESHOLD,
  GESTURE_OPEN_THRESHOLD,
  GESTURE_MIN_SWIPE_DISTANCE,
  GESTURE_VELOCITY_THRESHOLD,
  GESTURE_HORIZONTAL_THRESHOLD,
  GESTURE_VERTICAL_LOCK_THRESHOLD,
  GESTURE_ANGULAR_RATIO,
  GESTURE_VELOCITY_WINDOW_MS,
  GESTURE_TAP_TIMEOUT_MS,
  GESTURE_COOLDOWN_MS,
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
  onTransitionComplete?: () => void;
  onTrackMetric?: (metric: string, data: Record<string, unknown>) => void;
}

export class MobileMenuGestures implements GestureHandler {
  public name = 'MobileMenu';
  public priority = 100; // High priority for mobile menu
  // ── Adaptive thresholds (Problem 3) ──────────────────────────────────────────

  private get viewportWidth(): number {
    return this.sessionViewportWidth || (typeof window !== 'undefined' ? window.innerWidth : 1024);
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

    // Adjust for pointer type (D)
    const typeFactor = this.sessionPointerType === 'mouse' ? 1.5 : 1.0;

    return base * (this.dpr > 1.5 ? 0.8 : 1.0) * typeFactor;
  }

  private get velocityThreshold(): number {
    // S3 — Higher velocity threshold on higher DPI screens to reduce accidental triggers
    const base = this.config.velocityThreshold ?? GESTURE_VELOCITY_THRESHOLD;

    // Mouse requires higher velocity threshold (D)
    const typeFactor = this.sessionPointerType === 'mouse' ? 1.2 : 1.0;

    return base * (this.dpr > 1.5 ? 1.15 : 1.0) * typeFactor;
  }

  private get horizontalThreshold(): number {
    // Add hysteresis (E)
    const base = this.config.horizontalThreshold ?? GESTURE_HORIZONTAL_THRESHOLD;
    return this.isDragging ? base - 4 : base;
  }

  private get verticalLockThreshold(): number {
    return this.config.verticalLockThreshold ?? GESTURE_VERTICAL_LOCK_THRESHOLD;
  }

  private get tapThreshold(): number {
    // S3 — Adaptive tap threshold: slightly larger on high-DPI screens to reduce false negatives
    const base = 10 * (this.dpr > 1.5 ? 1.5 : 1.0);
    // Mouse is more precise
    return this.sessionPointerType === 'mouse' ? base * 0.7 : base;
  }

  // ── Gesture state ────────────────────────────────────────────────────────────
  private isDragging = false;
  private sessionViewportWidth = 0;
  private sessionMenuWidth = 0;
  private sessionIsRtl = false;
  private sessionPointerType = 'touch';

  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private isHorizontalGesture = false;
  private initialTranslateX = 0;
  private lastDragPosition = 0;
  private wasOvershooting = false;
  private activePointerId: number | null = null;
  private lastTransitionTime = -Infinity;

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

  /** Starts the gesture cooldown to prevent accidental re-triggers. */
  public startCooldown(): void {
    this.lastTransitionTime = performance.now();
  }

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
    return this.sessionIsRtl ? menuWidth : -menuWidth;
  }

  private getProgress(translateX: number, menuWidth: number): number {
    const closed = this.getClosedPosition(menuWidth);
    return this.sessionIsRtl
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
  private overlayStartTime = 0;

  public onPointerDown(event: PointerEvent): boolean {
    if (this.activePointerId !== null) return false;

    // P6 — Cooldown check to prevent accidental re-triggers
    if (performance.now() - this.lastTransitionTime < GESTURE_COOLDOWN_MS) {
      return false;
    }

    // Pointer guards (B)
    if (!event.isPrimary) return false;
    if (event.pointerType === 'mouse' && event.button !== 0) return false;

    // Freeze gesture context (C)
    this.sessionViewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    this.sessionMenuWidth = this.config.menuWidth;
    this.sessionIsRtl = this.config.isRtl();
    this.sessionPointerType = event.pointerType;

    const isRtl = this.sessionIsRtl;

    // 0. Check for Overlay Interaction (if open)
    if (this.config.isOpen()) {
      const target = event.target as HTMLElement;
      if (target?.classList.contains('jsl-mm-overlay')) {
        this.startOverlayInteraction(event);
        return true;
      }
    }

    // 1. Check for Edge Swipe (if enabled and closed)
    const isClosed = !this.config.isOpen() && !this.config.isAnimating();

    if (this.isEdgeSwipeEnabled && isClosed) {
      const isEdge = isRtl
        ? event.clientX > this.sessionViewportWidth - this.edgeThreshold
        : event.clientX < this.edgeThreshold;

      if (isEdge) {
        this.startEdgeSwipe(event);
        return true;
      }
    }

    // 2. Check for Drawer Drag (if open or animating)
    const isOpenOrAnimating = this.config.isOpen() || this.config.isAnimating();
    if (isOpenOrAnimating) {
      // Restrict capture when open (A)
      // Inicia drag solo si el pointerdown ocurrió dentro del drawer.
      const isInsideMenu = isRtl
        ? event.clientX > this.sessionViewportWidth - this.sessionMenuWidth
        : event.clientX < this.sessionMenuWidth;

      if (isInsideMenu) {
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
    this.overlayStartTime = performance.now();
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.wasOvershooting = false;
    this.isOverlaySwipeActive = true;
    this.resetVelocityBuffer();
    // Capture current visual position so the drawer follows the finger on overlay swipe
    this.initialTranslateX = this.config.getCurrentTranslateX();
    this.lastDragPosition = this.initialTranslateX;
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

    const menuWidth = this.sessionMenuWidth;
    this.initialTranslateX = this.sessionIsRtl ? menuWidth : -menuWidth;
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
      // Improved precision with angular ratio
      if (absDiffY > this.verticalLockThreshold && absDiffY > absDiffX * GESTURE_ANGULAR_RATIO) {
        this.trackMetric('gesture_cancel', { source: 'overlay_lock', reason: 'vertical_lock' });
        return;
      }
      if (absDiffX > this.horizontalThreshold && absDiffX > absDiffY * GESTURE_ANGULAR_RATIO) {
        this.isHorizontalGesture = true;
        this.isDragging = true;
        this.config.onToggleHaptic();
      }
    }

    if (this.isDragging && this.isHorizontalGesture) {
      this.pushVelocitySample(event.clientX);

      // Move the drawer in real time (parallax-to-close) so the gesture has
      // immediate physical feedback instead of waiting for pointerup.
      const menuWidth = this.sessionMenuWidth;
      const isRtl = this.sessionIsRtl;
      const closedPos = this.getClosedPosition(menuWidth);
      const openPos = 0;

      // Clamp to valid range: can only move toward closed, not past open
      const rawTranslate = this.initialTranslateX + diffX;
      const targetTranslate = isRtl
        ? Math.min(closedPos, Math.max(openPos, rawTranslate))
        : Math.max(closedPos, Math.min(openPos, rawTranslate));

      const isOvershooting = false; // clamped above; no elastic on overlay drag
      if (!isOvershooting && this.wasOvershooting) this.wasOvershooting = false;

      const progress = this.getProgress(targetTranslate, menuWidth);
      this.lastDragPosition = targetTranslate;
      this.config.onUpdateTranslate(
        targetTranslate,
        progress,
        1,
        isRtl ? 'right' : 'left'
      );
    }
  }

  private handleMenuDragMove(event: PointerEvent): void {
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
      // Improved precision with angular ratio
      if (absDiffY > this.verticalLockThreshold && absDiffY > absDiffX * GESTURE_ANGULAR_RATIO) {
        this.isHorizontalGesture = false;
        this.trackMetric('gesture_cancel', { source: 'drawer_lock', reason: 'vertical_lock' });
        return;
      }
      if (absDiffX > this.horizontalThreshold && absDiffX > absDiffY * GESTURE_ANGULAR_RATIO) {
        this.isHorizontalGesture = true;
        this.isDragging = true;
        this.config.onToggleHaptic();
      } else {
        return;
      }
    }

    if (!this.isHorizontalGesture || !this.isDragging) return;

    this.pushVelocitySample(event.clientX);

    const menuWidth = this.sessionMenuWidth;
    const isRtl = this.sessionIsRtl;
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
    const duration = performance.now() - this.overlayStartTime;

    const velocity = this.getInstantaneousVelocity();
    const isRtl = this.sessionIsRtl;

    // P2 — Swipe to close on overlay: require directionality for both velocity and distance
    const isValidDirection = isRtl ? diffX > 0 : diffX < 0;
    const isSwipeToClose =
      this.isDragging &&
      this.isHorizontalGesture &&
      isValidDirection &&
      (velocity > this.velocityThreshold || absDiffX > this.minSwipeDistance);

    if (isSwipeToClose) {
      this.config.onClose();
      this.startCooldown();
      this.trackMetric('gesture_complete', { action: 'close', source: 'overlay_swipe' });
    } else if (
      !this.isHorizontalGesture &&
      absDiffX < this.tapThreshold &&
      absDiffY < this.tapThreshold &&
      duration < GESTURE_TAP_TIMEOUT_MS
    ) {
      // P3 — Adaptive tap to close; ignore if it was a horizontal gesture attempt or too slow
      this.config.onClose();
      this.startCooldown();
      this.trackMetric('gesture_complete', { action: 'close', source: 'overlay_tap' });
    } else {
      this.trackMetric('gesture_cancel', {
        source: 'overlay_end',
        reason: this.isHorizontalGesture ? 'invalid_swipe' : 'failed_tap',
        absDiffX,
        absDiffY
      });
    }

    this.resetDragState();
    this.isOverlaySwipeActive = false;
  }

  private handleMenuDragEnd(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    if (!this.isDragging || !this.isHorizontalGesture) {
      this.config.onUpdateTranslate(this.lastDragPosition, null);
      this.trackMetric('gesture_cancel', { source: 'drawer' });
      this.resetDragState();
      return;
    }

    const diffX      = this.currentX - this.startX;
    const velocity   = this.getInstantaneousVelocity(); // instantaneous (P9)
    const menuWidth  = this.sessionMenuWidth;
    const progress   = this.getProgress(this.lastDragPosition, menuWidth);
    const isRtl      = this.sessionIsRtl;

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
      this.startCooldown();
      this.trackMetric('gesture_complete', { action: 'stay_open', source: 'drawer' });
    } else {
      this.config.onClose();
      this.startCooldown();
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

  private handleMenuDragCancel(event: PointerEvent): void {
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
      // Improved precision with angular ratio
      if (absDiffY > this.verticalLockThreshold && absDiffY > absDiffX * GESTURE_ANGULAR_RATIO) {
        this.cancelEdgeSwipe('vertical_lock');
        return;
      }
      if (absDiffX > this.horizontalThreshold && absDiffX > absDiffY * GESTURE_ANGULAR_RATIO) {
        this.isHorizontalGesture = true;
        this.config.onToggleHaptic();
      } else {
        return;
      }
    }

    const isRtl           = this.sessionIsRtl;
    const isValidDirection = isRtl ? diffX < 0 : diffX > 0;
    if (!this.isHorizontalGesture || !isValidDirection) return;

    this.pushVelocitySample(event.clientX);

    const menuWidth = this.sessionMenuWidth;
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
      const menuWidth = this.sessionMenuWidth;
      const closedPos = this.sessionIsRtl ? menuWidth : -menuWidth;
      this.resetDragState();
      this.config.onUpdateTranslate(closedPos, null);
      this.trackMetric('gesture_cancel', { source: 'edge' });
      return;
    }

    const diffX    = this.currentX - this.startX;
    const velocity = this.getInstantaneousVelocity(); // instantaneous (P9)
    const menuWidth  = this.sessionMenuWidth;
    const progress   = this.getProgress(this.lastDragPosition, menuWidth);

    // Improvement 4: Re-validate direction for velocity and distance branches
    const isRtl = this.sessionIsRtl;
    const isValidDirection = isRtl ? diffX < 0 : diffX > 0;

    const shouldOpen =
      (velocity > this.velocityThreshold && isValidDirection) ||
      progress > this.openThreshold ||
      (Math.abs(diffX) > this.minSwipeDistance && isValidDirection);

    const lastPos = this.lastDragPosition;
    this.resetDragState();
    this.config.onUpdateTranslate(lastPos, null);

    if (shouldOpen) {
      this.config.onOpen();
      this.startCooldown();
      this.trackMetric('gesture_complete', { action: 'open', source: 'edge' });
    } else {
      this.config.onClose();
      this.startCooldown();
      this.trackMetric('gesture_complete', { action: 'close_abort', source: 'edge' });
    }
  };

  private cancelEdgeSwipe(reason = 'edge_lock'): void {
    const menuWidth = this.sessionMenuWidth;
    const closedPos = this.sessionIsRtl ? menuWidth : -menuWidth;
    this.resetDragState();
    this.config.onUpdateTranslate(closedPos, null);
    this.trackMetric('gesture_cancel', { source: 'edge_lock', reason });
  }

  // R2 — on system cancel (incoming call, app switch, lost pointer) during an
  // edge swipe, always revert to the stable closed position. Never apply
  // velocity/progress logic on an involuntary interruption.
  private handleEdgeSwipeCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;

    const menuWidth = this.sessionMenuWidth;
    const closedPos = this.sessionIsRtl ? menuWidth : -menuWidth;
    this.resetDragState();
    this.config.onUpdateTranslate(closedPos, null);
    this.config.onClose();
    this.trackMetric('gesture_cancel', { source: 'edge_system_interrupt' });
  };

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
