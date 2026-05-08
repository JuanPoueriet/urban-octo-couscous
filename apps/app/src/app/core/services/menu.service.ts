import { Injectable, signal } from '@angular/core';

export type MenuCloseReason =
  | 'overlay'
  | 'escape'
  | 'button'
  | 'gesture'
  | 'navigation'
  | 'system';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  isMobileMenuOpen = signal(false);
  closeReason = signal<MenuCloseReason | null>(null);

  /**
   * Timestamp (performance.now()) of the last time the menu state changed.
   * Used to guard against "ghost clicks" and rapid interaction spam.
   */
  lastStateChangeAt = signal<number>(-1e10);

  open() {
    this.lastStateChangeAt.set(performance.now());
    this.isMobileMenuOpen.set(true);
    this.closeReason.set(null);
  }

  close(reason: MenuCloseReason = 'system') {
    this.lastStateChangeAt.set(performance.now());
    this.closeReason.set(reason);
    this.isMobileMenuOpen.set(false);
  }

  toggle(reasonOnClose: MenuCloseReason = 'button') {
    this.lastStateChangeAt.set(performance.now());
    this.isMobileMenuOpen.update((isOpen) => {
      const nextState = !isOpen;
      if (!nextState) {
        this.closeReason.set(reasonOnClose);
      } else {
        this.closeReason.set(null);
      }
      return nextState;
    });
  }
}
