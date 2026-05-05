import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class OverlayManagerService {
  private platformId = inject(PLATFORM_ID);

  /** LIFO stack of active overlays */
  private overlayStack: string[] = [];

  /**
   * Selector for the main application content that should be isolated
   * when any overlay is active.
   */
  private readonly rootContentSelector = 'main, jsl-footer, jsl-top-bar, .header__nav';

  /**
   * Registers an active overlay and pushes it to the stack.
   * @param id Unique identifier for the overlay.
   */
  register(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    // Avoid duplicates in the stack
    this.unregister(id);
    this.overlayStack.push(id);

    this.updateInertState();
  }

  /**
   * Unregisters an active overlay and removes it from the stack.
   * @param id Unique identifier for the overlay.
   */
  unregister(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.overlayStack = this.overlayStack.filter(item => item !== id);
    this.updateInertState();
  }

  /**
   * Returns the ID of the topmost active overlay.
   */
  getActiveOverlayId(): string | null {
    return this.overlayStack.length > 0 ? this.overlayStack[this.overlayStack.length - 1] : null;
  }

  /**
   * Updates the 'inert' attribute on background elements based on overlay stack.
   */
  private updateInertState(): void {
    const hasActiveOverlays = this.overlayStack.length > 0;
    const targets = document.querySelectorAll(this.rootContentSelector);

    targets.forEach((target) => {
      if (hasActiveOverlays) {
        target.setAttribute('inert', '');
      } else {
        target.removeAttribute('inert');
      }
    });

    // Optional: Handle interaction between overlays in the stack
    // e.g., if there are multiple overlays, the ones below the top should also be inert.
    // This would require overlays to be in the DOM and identifiable.
    // For now, isolating the main content is the primary requirement.
  }
}
