import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  /**
   * Signal to manage the state of the mobile menu (open/closed).
   */
  isMobileMenuOpen = signal(false);

  /**
   * Opens the mobile menu.
   */
  open() {
    this.isMobileMenuOpen.set(true);
  }

  /**
   * Closes the mobile menu.
   */
  close() {
    this.isMobileMenuOpen.set(false);
  }

  /**
   * Toggles the mobile menu state.
   */
  toggle() {
    this.isMobileMenuOpen.update((prev) => !prev);
  }
}
