import { ElementRef } from '@angular/core';

export class MobileMenuAccessibility {
  private lastFocusedElement: HTMLElement | null = null;

  constructor(private el: ElementRef) {}

  public saveFocus() {
    this.lastFocusedElement = document.activeElement as HTMLElement;
  }

  public restoreFocus() {
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      this.lastFocusedElement.focus();
    }
  }

  public setInitialFocus() {
    const closeBtn = this.el.nativeElement.querySelector('.mobile-close-btn');
    if (closeBtn) {
      (closeBtn as HTMLElement).focus();
    }
  }

  public trapFocus(event: KeyboardEvent) {
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const allPotential = Array.from(
      this.el.nativeElement.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    const focusableElements = allPotential.filter(el => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        rect.width > 0 &&
                        rect.height > 0;
      return isVisible;
    });

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement || !this.el.nativeElement.contains(document.activeElement)) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement || !this.el.nativeElement.contains(document.activeElement)) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }
}
