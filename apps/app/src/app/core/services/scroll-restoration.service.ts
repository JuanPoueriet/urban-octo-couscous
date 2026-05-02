import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, Scroll, Event } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import Lenis from 'lenis';

interface LenisWithScrollTo extends Lenis {
  scrollTo(target: number | string | HTMLElement, options?: any): void;
  scroll: number;
}

@Injectable({
  providedIn: 'root',
})
export class ScrollRestorationService implements OnDestroy {
  private lenis: LenisWithScrollTo | null = null;
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private currentRetryId: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.init();
    }
  }

  private init(): void {
    this.router.events
      .pipe(
        filter((e: Event): e is Scroll => e instanceof Scroll),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        if (this.currentRetryId) {
          clearTimeout(this.currentRetryId);
          this.currentRetryId = null;
        }

        if (e.position) {
          // backward/forward navigation
          this.restoreScroll(e.position[1]);
        } else if (e.anchor) {
          // anchor navigation
          this.scrollToAnchor(e.anchor);
        } else {
          // standard navigation
          this.scrollToTop();
        }
      });
  }

  public registerLenis(lenis: Lenis): void {
    this.lenis = lenis as LenisWithScrollTo;
  }

  private restoreScroll(y: number): void {
    this.retryApplyScroll(y, 0);
  }

  private scrollToAnchor(anchor: string): void {
    const attempt = () => {
      const element = document.getElementById(anchor);
      if (element) {
        if (this.lenis) {
          this.lenis.scrollTo(element, { immediate: true });
        } else {
          element.scrollIntoView();
        }
        return true;
      }
      return false;
    };

    if (!attempt()) {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        if (attempt() || count > 20) {
          clearInterval(interval);
        }
      }, 100);
    }
  }

  private scrollToTop(): void {
    this.retryApplyScroll(0, 0);
  }

  private retryApplyScroll(targetY: number, attempts: number): void {
    this.applyScroll(targetY);
    const currentY = this.getCurrentScrollY();

    if (Math.abs(currentY - targetY) <= 2) {
      return;
    }

    if (attempts > 60) {
      return;
    }

    this.currentRetryId = setTimeout(() => {
      this.retryApplyScroll(targetY, attempts + 1);
    }, 100);
  }

  private applyScroll(y: number): void {
    if (this.lenis) {
      this.lenis.scrollTo(y, { immediate: true });
    } else {
      window.scrollTo(0, y);
    }
  }

  private getCurrentScrollY(): number {
    return this.lenis ? this.lenis.scroll : window.scrollY;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.currentRetryId) {
      clearTimeout(this.currentRetryId);
    }
  }
}
