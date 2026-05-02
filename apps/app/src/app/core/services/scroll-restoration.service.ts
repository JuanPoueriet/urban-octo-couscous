import { Injectable, Inject, PLATFORM_ID, OnDestroy, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, Scroll, Event, NavigationEnd, NavigationStart } from '@angular/router';
import { filter, takeUntil, first } from 'rxjs/operators';
import { Subject, fromEvent, firstValueFrom } from 'rxjs';
import { ScrollEngineService } from './scroll-engine.service';
import { waitForStableLayout } from '../../shared/utils/layout-stability';

interface ScrollState {
  y: number;
  anchor: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ScrollRestorationService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private scrollHistory = new Map<string, ScrollState>();

  constructor(
    private router: Router,
    private scrollEngine: ScrollEngineService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.init();
    }
  }

  private init(): void {
    // Capture state before navigation
    this.router.events
      .pipe(
        filter((e: Event): e is NavigationStart => e instanceof NavigationStart),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => {
        this.captureScrollState(this.router.url);
      });

    this.router.events
      .pipe(
        filter((e: Event): e is Scroll => e instanceof Scroll),
        takeUntil(this.destroy$)
      )
      .subscribe(async (e) => {
        // Wait for engine and layout stability
        await firstValueFrom(this.scrollEngine.isReady$().pipe(filter(ready => ready)));
        await waitForStableLayout(3000, 200, this.platformId);

        if (e.position) {
          // backward/forward navigation
          const url = (e.routerEvent as any).urlAfterRedirects || (e.routerEvent as any).url || '';
          this.restoreScroll(url, e.position[1]);
        } else if (e.anchor) {
          // anchor navigation
          this.scrollToAnchor(e.anchor);
        } else {
          // standard navigation
          this.scrollToTop();
        }
      });
  }

  private captureScrollState(url: string): void {
    if (!this.isBrowser) return;

    const y = window.scrollY;
    const anchor = this.findSemanticAnchor();

    if (isDevMode()) {
      console.log(`[ScrollRestoration] Capturing state for ${url}: y=${y}, anchor=${anchor}`);
    }

    this.scrollHistory.set(url, { y, anchor });
  }

  private findSemanticAnchor(): string | null {
    // 1. Try to find an element with data-scroll-anchor near the top of viewport
    const viewportHeight = window.innerHeight;
    const checkPoints = [0.1, 0.2, 0.3, 0.5]; // Check various points in top half

    for (const point of checkPoints) {
      const el = document.elementFromPoint(window.innerWidth / 2, viewportHeight * point);
      if (el) {
        // Find closest ancestor with id or data-scroll-anchor
        const anchorEl = el.closest('[id], [data-scroll-anchor]');
        if (anchorEl) {
          return anchorEl.getAttribute('data-scroll-anchor') || anchorEl.id;
        }
      }
    }

    // 2. Fallback to first visible heading
    const headings = document.querySelectorAll('h1, h2, h3');
    for (let i = 0; i < headings.length; i++) {
      const rect = headings[i].getBoundingClientRect();
      if (rect.top >= 0 && rect.top <= viewportHeight) {
        return headings[i].id || null;
      }
    }

    return null;
  }

  private async restoreScroll(url: string, fallbackY: number): Promise<void> {
    const state = this.scrollHistory.get(url);
    const headerOffset = this.scrollEngine.getHeaderOffset();

    if (state?.anchor) {
      const element = document.getElementById(state.anchor) ||
                      document.querySelector(`[data-scroll-anchor="${state.anchor}"]`);

      if (element) {
        if (isDevMode()) {
          console.log(`[ScrollRestoration] Restoring via anchor: ${state.anchor} for ${url}`);
        }
        this.scrollEngine.scrollTo(element as HTMLElement, {
          offset: -headerOffset,
          immediate: true
        });
        return;
      }
    }

    // Fallback to absolute Y
    const targetY = state ? state.y : fallbackY;
    if (isDevMode()) {
      console.log(`[ScrollRestoration] Restoring via Y coordinate: ${targetY} for ${url}`);
    }
    this.scrollEngine.scrollTo(targetY, { immediate: true });
  }

  private scrollToAnchor(anchor: string): void {
    const element = document.getElementById(anchor) ||
                    document.querySelector(`[data-scroll-anchor="${anchor}"]`);
    const headerOffset = this.scrollEngine.getHeaderOffset();

    if (element) {
      this.scrollEngine.scrollTo(element as HTMLElement, {
        offset: -headerOffset
      });
    } else if (isDevMode()) {
      console.warn(`[ScrollRestoration] Anchor not found: ${anchor}`);
    }
  }

  private scrollToTop(): void {
    this.scrollEngine.scrollTo(0, { immediate: true });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
