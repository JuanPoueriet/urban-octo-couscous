import { Injectable, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, Scroll, Event } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import Lenis from 'lenis';

interface LenisWithScrollTo extends Lenis {
  scrollTo(target: number | string | HTMLElement, options?: any): void;
}

@Injectable({
  providedIn: 'root',
})
export class ScrollRestorationService implements OnDestroy {
  private lenis: LenisWithScrollTo | null = null;
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;

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
    // We use a small timeout to ensure the DOM has rendered
    const attemptRestore = (remainingAttempts: number) => {
      if (this.lenis) {
        this.lenis.scrollTo(y, { immediate: true });
      } else {
        window.scrollTo(0, y);
      }

      if (remainingAttempts > 0) {
        setTimeout(() => attemptRestore(remainingAttempts - 1), 100);
      }
    };

    setTimeout(() => attemptRestore(5), 100);
  }

  private scrollToAnchor(anchor: string): void {
    setTimeout(() => {
      const element = document.getElementById(anchor);
      if (element) {
        if (this.lenis) {
          this.lenis.scrollTo(element);
        } else {
          element.scrollIntoView();
        }
      }
    }, 0);
  }

  private scrollToTop(): void {
    setTimeout(() => {
      if (this.lenis) {
        this.lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    }, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
