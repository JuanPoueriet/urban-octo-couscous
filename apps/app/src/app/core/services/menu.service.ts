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

  open() {
    this.isMobileMenuOpen.set(true);
    this.closeReason.set(null);
  }

  close(reason: MenuCloseReason = 'system') {
    this.closeReason.set(reason);
    this.isMobileMenuOpen.set(false);
  }

  toggle(reasonOnClose: MenuCloseReason = 'button') {
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
