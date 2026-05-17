import { NgZone } from '@angular/core';
import { GestureBusService, GestureHandler } from '@core/services/gesture-bus.service';

export interface BottomSheetGestureConfig {
  /**
   * Threshold in pixels to trigger a close when dragging down.
   */
  closeThreshold?: number;

  /**
   * Velocity threshold in px/ms to trigger a close on flick.
   */
  velocityThreshold?: number;

  /**
   * Elastic resistance for upward dragging (0 to 1).
   */
  elasticResistance?: number;

  /**
   * Current open state.
   */
  isOpen: () => boolean;

  /**
   * Whether the internal content is at its top scroll position.
   */
  isAtTop: () => boolean;

  /**
   * Callback to update the visual translation.
   * @param translateY The current Y translation in pixels.
   * @param progress A normalized value (1 = open, 0 = closed) for overlay opacity.
   */
  onUpdateTranslate: (translateY: number, progress: number | null) => void;

  /**
   * Trigger the close action.
   */
  onClose: () => void;

  /**
   * Trigger the open action (restore to open state).
   */
  onOpen: () => void;

  /**
   * Stop any active transitions.
   */
  onStopTransition: () => void;
}

export class BottomSheetGestures implements GestureHandler {
  public name = 'BottomSheet';
  public priority = 110;

  private isDragging = false;
  private activePointerId: number | null = null;
  private startY = 0;
  private currentY = 0;
  private initialTranslateY = 0;
  private lastDragPosition = 0;

  private velocityBuffer: Array<{ y: number; t: number }> = [];

  private readonly VELOCITY_WINDOW_MS = 100;
  private readonly DEFAULT_VELOCITY_THRESHOLD = 0.25;
  private readonly DEFAULT_CLOSE_THRESHOLD = 150;
  private readonly DEFAULT_ELASTIC_RESISTANCE = 0.25;

  private gestureBusUnregister: (() => void) | null = null;

  constructor(
    private config: BottomSheetGestureConfig,
    private ngZone: NgZone,
    private gestureBus: GestureBusService
  ) {
    this.gestureBusUnregister = this.gestureBus.registerHandler(this);
  }

  public onPointerDown(event: PointerEvent): boolean {
    if (this.activePointerId !== null || !this.config.isOpen()) return false;

    // Check if the target is interactive content that should handle its own pointers
    const target = event.target as HTMLElement;
    if (this.isInteractiveElement(target)) return false;

    // We only start dragging if at top or if dragging the handle
    const isHandle = !!target.closest('.bottom-sheet-handle-wrapper');
    if (!isHandle && !this.config.isAtTop()) return false;

    this.activePointerId = event.pointerId;
    this.startY = event.clientY;
    this.currentY = this.startY;
    this.initialTranslateY = 0;
    this.isDragging = false;
    this.resetVelocityBuffer();
    this.config.onStopTransition();

    return true;
  }

  public onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    this.currentY = event.clientY;
    const diffY = this.currentY - this.startY;
    this.pushVelocitySample(this.currentY);

    if (!this.isDragging) {
      if (Math.abs(diffY) > 5) {
        this.isDragging = true;
      } else {
        return;
      }
    }

    let targetTranslate = diffY;

    // Elastic effect when dragging UP (diffY < 0)
    if (targetTranslate < 0) {
      const resistance = this.config.elasticResistance ?? this.DEFAULT_ELASTIC_RESISTANCE;
      targetTranslate = targetTranslate * resistance;
    }

    this.lastDragPosition = targetTranslate;

    // Progress calculation for overlay
    // 0 is fully open, closeThreshold is where it should be almost closed
    const closeThreshold = this.config.closeThreshold ?? this.DEFAULT_CLOSE_THRESHOLD;
    const progress = targetTranslate > 0
      ? Math.max(0, 1 - (targetTranslate / (closeThreshold * 2)))
      : 1;

    this.config.onUpdateTranslate(targetTranslate, progress);
  }

  public onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;

    if (!this.isDragging) {
      this.resetDragState();
      return;
    }

    const velocity = this.getInstantaneousVelocity();
    const diffY = this.currentY - this.startY;
    const closeThreshold = this.config.closeThreshold ?? this.DEFAULT_CLOSE_THRESHOLD;
    const velocityThreshold = this.config.velocityThreshold ?? this.DEFAULT_VELOCITY_THRESHOLD;

    const shouldClose = diffY > closeThreshold || (velocity > velocityThreshold && diffY > 20);

    if (shouldClose) {
      this.config.onClose();
    } else {
      this.config.onOpen();
    }

    this.config.onUpdateTranslate(this.lastDragPosition, null);
    this.resetDragState();
  }

  public onPointerCancel(event: PointerEvent): void {
    if (event.pointerId !== this.activePointerId) return;
    this.config.onOpen();
    this.config.onUpdateTranslate(this.lastDragPosition, null);
    this.resetDragState();
  }

  private isInteractiveElement(target: HTMLElement): boolean {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    if (interactiveTags.includes(target.tagName)) return true;
    if (target.closest('button, a, input, select, textarea')) return true;
    return false;
  }

  private resetDragState(): void {
    this.isDragging = false;
    this.activePointerId = null;
    this.resetVelocityBuffer();
  }

  private pushVelocitySample(y: number): void {
    const now = performance.now();
    const cutoff = now - this.VELOCITY_WINDOW_MS;
    this.velocityBuffer.push({ y, t: now });
    while (this.velocityBuffer.length > 0 && this.velocityBuffer[0].t < cutoff) {
      this.velocityBuffer.shift();
    }
  }

  private getInstantaneousVelocity(): number {
    if (this.velocityBuffer.length < 2) return 0;
    const first = this.velocityBuffer[0];
    const last = this.velocityBuffer[this.velocityBuffer.length - 1];
    const dt = last.t - first.t;
    return dt > 0 ? (last.y - first.y) / dt : 0;
  }

  private resetVelocityBuffer(): void {
    this.velocityBuffer = [];
  }

  public destroy(): void {
    if (this.gestureBusUnregister) {
      this.gestureBusUnregister();
      this.gestureBusUnregister = null;
    }
  }
}
