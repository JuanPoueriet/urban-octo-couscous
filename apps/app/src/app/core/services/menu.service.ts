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
  /**
   * Signal to manage the state of the mobile menu (open/closed).
   */
  isMobileMenuOpen = signal(false);

  /**
   * Signal to track the reason for the last closure (Problem 5).
   */
  closeReason = signal<MenuCloseReason | null>(null);

  /**
   * Opens the mobile menu.
   */
  open() {
    this.isMobileMenuOpen.set(true);
    this.closeReason.set(null);
  }

  /**
   * Closes the mobile menu.
   * @param reason The reason for closing the menu.
   */
  close(reason: MenuCloseReason = 'system') {
    this.closeReason.set(reason);
    this.isMobileMenuOpen.set(false);
  }

  /**
   * Toggles the mobile menu state.
   */
  toggle() {
    this.isMobileMenuOpen.update((prev) => !prev);
  }
}
