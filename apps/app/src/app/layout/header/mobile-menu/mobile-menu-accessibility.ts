import { ElementRef } from '@angular/core';

export class MobileMenuAccessibility {
  private lastFocusedElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(private el: ElementRef) {}

  public saveFocus() {
    this.lastFocusedElement = document.activeElement as HTMLElement;
  }

  public restoreFocus(fallbackSelector = '.header__mobile-toggle') {
    if (this.lastFocusedElement && this.isValidForFocus(this.lastFocusedElement)) {
      try {
        this.lastFocusedElement.focus({ preventScroll: true });
        return;
      } catch (e) {
        console.warn('Failed to restore focus to last focused element', e);
      }
    }

    // Fallback if the original element is gone or hidden
    const fallback = document.querySelector(fallbackSelector) as HTMLElement;
    if (fallback && this.isValidForFocus(fallback)) {
      fallback.focus();
    }
  }

  private isValidForFocus(el: HTMLElement): boolean {
    if (!el || !el.isConnected) return false;

    const style = window.getComputedStyle(el);
    const isVisible = style.display !== 'none' &&
                      style.visibility !== 'hidden' &&
                      style.opacity !== '0';

    const isInert = el.hasAttribute('inert') || el.closest('[inert]') !== null;
    const isDisabled = (el as any).disabled === true;

    return isVisible && !isInert && !isDisabled;
  }

  public setInitialFocus() {
    const closeBtn = this.el.nativeElement.querySelector('.mobile-close-btn');
    if (closeBtn) {
      (closeBtn as HTMLElement).focus();
    }
  }

  public refreshFocusableElements() {
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const allPotential = Array.from(
      this.el.nativeElement.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    this.focusableElements = allPotential.filter(el => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        rect.width > 0 &&
                        rect.height > 0;
      return isVisible;
    });
  }

  public trapFocus(event: KeyboardEvent) {
    if (this.focusableElements.length === 0) {
      this.refreshFocusableElements();
    }

    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

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
