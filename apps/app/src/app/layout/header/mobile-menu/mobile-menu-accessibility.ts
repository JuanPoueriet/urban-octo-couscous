import { ElementRef } from '@angular/core';

export class MobileMenuAccessibility {
  private lastFocusedElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];
  private observer: MutationObserver | null = null;

  constructor(
    private el: ElementRef,
    private isBrowser: boolean
  ) {}

  public saveFocus() {
    if (!this.isBrowser) return;
    this.lastFocusedElement = document.activeElement as HTMLElement;
  }

  public restoreFocus(fallbackSelector = '.header__mobile-toggle') {
    if (!this.isBrowser) return;

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
    if (!this.isBrowser || !el || !el.isConnected) return false;

    const style = window.getComputedStyle(el);
    const isVisible = style.display !== 'none' &&
                      style.visibility !== 'hidden' &&
                      style.opacity !== '0';

    const isInert = el.hasAttribute('inert') || el.closest('[inert]') !== null;
    const isDisabled = (el as any).disabled === true;

    return isVisible && !isInert && !isDisabled;
  }

  public setInitialFocus() {
    if (!this.isBrowser) return;
    const closeBtn = this.el.nativeElement.querySelector('.mobile-close-btn');
    if (closeBtn) {
      (closeBtn as HTMLElement).focus();
    }
  }

  public refreshFocusableElements() {
    if (!this.isBrowser) return;

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
    if (!this.isBrowser) return;

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

  /**
   * Handles focus events on sentinel elements to cycle focus deterministically (Problem 6).
   */
  public handleSentinelFocus(event: FocusEvent, type: 'start' | 'end') {
    if (!this.isBrowser) return;

    this.refreshFocusableElements();
    if (this.focusableElements.length === 0) return;

    // Filter out the sentinels themselves from the focusable list to find real targets
    const realFocusables = this.focusableElements.filter(
      el => !el.classList.contains('focus-sentinel')
    );

    if (realFocusables.length === 0) return;

    if (type === 'start') {
      realFocusables[realFocusables.length - 1].focus();
    } else {
      realFocusables[0].focus();
    }
  }

  public startObserving() {
    if (!this.isBrowser || this.observer) return;

    this.observer = new MutationObserver(() => {
      this.refreshFocusableElements();
    });

    this.observer.observe(this.el.nativeElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'disabled', 'hidden', 'inert']
    });
  }

  public stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
