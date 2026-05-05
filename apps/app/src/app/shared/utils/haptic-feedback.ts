/**
 * Utility for triggering haptic feedback on mobile devices.
 */
export function triggerTick(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    // A single 10ms vibration is a subtle "tick" for mobile devices.
    // Use it for slide changes or scroll milestones.
    navigator.vibrate(10);
  }
}
