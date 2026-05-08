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

  // Timestamp del último cambio de estado para prevenir rebotes y ghost clicks.
  // Se usa performance.now() para máxima precisión.
  private lastStateChangeAt = 0;
  private readonly TOGGLE_COOLDOWN_MS = 350;

  private updateLastChangeTime() {
    this.lastStateChangeAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  open() {
    this.updateLastChangeTime();
    this.isMobileMenuOpen.set(true);
    this.closeReason.set(null);
  }

  close(reason: MenuCloseReason = 'system') {
    this.updateLastChangeTime();
    this.closeReason.set(reason);
    this.isMobileMenuOpen.set(false);
  }

  toggle(reasonOnClose: MenuCloseReason = 'button') {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastStateChangeAt < this.TOGGLE_COOLDOWN_MS) {
      return;
    }

    this.updateLastChangeTime();
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
