import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class ScrollLockService {
  private platformId = inject(PLATFORM_ID);
  private activeLockers = new Set<string>();

  /**
   * Locks the body scroll.
   * @param id Unique identifier for the locker.
   */
  lock(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.activeLockers.add(id);
    this.updateScrollState();
  }

  /**
   * Unlocks the body scroll.
   * @param id Unique identifier for the locker.
   */
  unlock(id: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.activeLockers.delete(id);
    this.updateScrollState();
  }

  /**
   * Updates the body 'no-scroll' class based on active lockers.
   */
  private updateScrollState(): void {
    if (this.activeLockers.size > 0) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
  }
}
