import { Injectable, Inject, PLATFORM_ID, OnDestroy, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, Scroll, Event, NavigationStart } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject, fromEvent, firstValueFrom } from 'rxjs';
import { ScrollEngineService } from './scroll-engine.service';
import { waitForStableLayout } from '../../shared/utils/layout-stability';

interface ScrollState {
  y: number;
  anchor: string | null;
  scrollKey: string | null;
  relativeTop: number | null;
}

/**
 * Service responsible for restoring scroll position with high precision.
 * It uses a cascading strategy:
 * 1. High-precision: Restore an element (identified by data-scroll-key) to its exact relative position in the viewport.
 * 2. Semantic: Restore to a saved anchor (data-scroll-anchor or ID).
 * 3. Coordinate: Restore to absolute Y position.
 * 4. Fallback: Scroll to top.
 */
@Injectable({
  providedIn: 'root',
})
export class ScrollRestorationService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private scrollHistory = new Map<string, ScrollState>();
  private lastInteractedKey: string | null = null;

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
    // Track the last clicked element with a scroll key
    fromEvent<MouseEvent>(document, 'click', { capture: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe((event) => {
        const target = event.target as HTMLElement;
        const scrollEl = target.closest('[data-scroll-key]');
        if (scrollEl) {
          this.lastInteractedKey = scrollEl.getAttribute('data-scroll-key');
        } else {
          this.lastInteractedKey = null;
        }
      });

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
    let scrollKey = this.lastInteractedKey;
    let relativeTop: number | null = null;

    if (scrollKey) {
      const el = document.querySelector(`[data-scroll-key="${scrollKey}"]`);
      if (el) {
        relativeTop = el.getBoundingClientRect().top;
      } else {
        scrollKey = null;
      }
    }

    if (isDevMode()) {
      console.log(`[ScrollRestoration] Capturing state for ${url}: y=${y}, anchor=${anchor}, key=${scrollKey}, relTop=${relativeTop}`);
    }

    this.scrollHistory.set(url, { y, anchor, scrollKey, relativeTop });
    // Reset interacted key after capture
    this.lastInteractedKey = null;
  }

  private findSemanticAnchor(): string | null {
    const viewportHeight = window.innerHeight;
    const checkPoints = [0.1, 0.2, 0.3, 0.5];

    for (const point of checkPoints) {
      const el = document.elementFromPoint(window.innerWidth / 2, viewportHeight * point);
      if (el) {
        const anchorEl = el.closest('[id], [data-scroll-anchor]');
        if (anchorEl) {
          return anchorEl.getAttribute('data-scroll-anchor') || anchorEl.id;
        }
      }
    }

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

    // 1. High-precision restoration via scrollKey and relative position
    if (state?.scrollKey && state.relativeTop !== null) {
      const element = document.querySelector(`[data-scroll-key="${state.scrollKey}"]`);
      if (element) {
        if (isDevMode()) {
          console.log(`[ScrollRestoration] High-precision restore: ${state.scrollKey} at relTop ${state.relativeTop}`);
        }
        // To put the element at state.relativeTop from the top of the viewport,
        // we use the negative value as the offset, since scrollTo adds it to the element's position.
        this.scrollEngine.scrollTo(element as HTMLElement, {
          offset: -state.relativeTop,
          immediate: true
        });
        return;
      }
    }

    // 2. Restoration via semantic anchor
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

    // 3. Fallback to absolute Y coordinate
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
