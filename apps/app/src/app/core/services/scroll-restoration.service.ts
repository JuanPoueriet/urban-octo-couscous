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
  private readonly STORAGE_KEY = 'jsl_scroll_history';
  private readonly MAX_HISTORY_SIZE = 100;
  private destroy$ = new Subject<void>();
  private isBrowser: boolean;
  private scrollHistory = new Map<string, ScrollState>();
  private lastInteractedKey: string | null = null;
  private currentNavigationId = 0;

  constructor(
    private router: Router,
    private scrollEngine: ScrollEngineService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      this.loadHistoryFromStorage();
      this.init();
    }
  }

  private init(): void {
    // Track the last clicked or focused element with a scroll key
    const interactionEvents = ['click', 'focusin'];
    interactionEvents.forEach((eventType) => {
      fromEvent<UIEvent>(document, eventType, { capture: true })
        .pipe(takeUntil(this.destroy$))
        .subscribe((event) => {
          const target = event.target as HTMLElement;
          const scrollEl = target.closest('[data-scroll-key]');
          if (scrollEl) {
            this.lastInteractedKey = scrollEl.getAttribute('data-scroll-key');
          } else if (eventType === 'click') {
            this.lastInteractedKey = null;
          }
        });
    });

    // Capture state before navigation
    this.router.events
      .pipe(
        filter((e: Event): e is NavigationStart => e instanceof NavigationStart),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.captureScrollState(this.router.url);
      });

    this.router.events
      .pipe(
        filter((e: Event): e is Scroll => e instanceof Scroll),
        takeUntil(this.destroy$)
      )
      .subscribe(async (e) => {
        const navId = ++this.currentNavigationId;

        // Wait for engine and layout stability
        await firstValueFrom(this.scrollEngine.isReady$().pipe(filter((ready) => ready)));
        if (navId !== this.currentNavigationId) return;

        await waitForStableLayout(3000, 200, this.platformId);
        if (navId !== this.currentNavigationId) return;

        if (e.position) {
          // backward/forward navigation
          const routerEvent = e.routerEvent as { urlAfterRedirects?: string; url?: string };
          const url = routerEvent.urlAfterRedirects || routerEvent.url || '';
          this.restoreScroll(url, e.position[1], navId);
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
      console.log(
        `[ScrollRestoration] Capturing state for ${url}: y=${y}, anchor=${anchor}, key=${scrollKey}, relTop=${relativeTop}`
      );
    }

    // LRU-like eviction: if we exceed MAX_HISTORY_SIZE, remove the oldest entry
    if (this.scrollHistory.size >= this.MAX_HISTORY_SIZE && !this.scrollHistory.has(url)) {
      const firstKey = this.scrollHistory.keys().next().value;
      if (firstKey) this.scrollHistory.delete(firstKey);
    }

    // Set or update (updates order for LRU)
    this.scrollHistory.delete(url);
    this.scrollHistory.set(url, { y, anchor, scrollKey, relativeTop });

    this.saveHistoryToStorage();

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

  private async restoreScroll(url: string, fallbackY: number, navId: number): Promise<void> {
    const state = this.scrollHistory.get(url);
    const headerOffset = this.scrollEngine.getHeaderOffset();

    // 1. High-precision restoration via scrollKey and relative position
    if (state?.scrollKey && state.relativeTop !== null) {
      const element = document.querySelector(`[data-scroll-key="${state.scrollKey}"]`);
      if (element) {
        if (navId !== this.currentNavigationId) return;
        if (isDevMode()) {
          console.log(
            `[ScrollRestoration] High-precision restore: ${state.scrollKey} at relTop ${state.relativeTop}`
          );
        }
        this.scrollEngine.scrollTo(element as HTMLElement, {
          offset: state.relativeTop,
          immediate: true,
        });
        return;
      }
    }

    // 2. Restoration via semantic anchor
    if (state?.anchor) {
      const element =
        document.getElementById(state.anchor) ||
        document.querySelector(`[data-scroll-anchor="${state.anchor}"]`);

      if (element) {
        if (navId !== this.currentNavigationId) return;
        if (isDevMode()) {
          console.log(`[ScrollRestoration] Restoring via anchor: ${state.anchor} for ${url}`);
        }
        this.scrollEngine.scrollTo(element as HTMLElement, {
          offset: -headerOffset,
          immediate: true,
        });
        return;
      }
    }

    // 3. Fallback to absolute Y coordinate
    if (navId !== this.currentNavigationId) return;
    const targetY = state ? state.y : fallbackY;
    if (isDevMode()) {
      console.log(`[ScrollRestoration] Restoring via Y coordinate: ${targetY} for ${url}`);
    }
    this.scrollEngine.scrollTo(targetY, { immediate: true });
  }

  private loadHistoryFromStorage(): void {
    if (!this.isBrowser) return;
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.scrollHistory = new Map(Object.entries(parsed));
      }
    } catch (e) {
      if (isDevMode()) console.error('[ScrollRestoration] Error loading history', e);
    }
  }

  private saveHistoryToStorage(): void {
    if (!this.isBrowser) return;
    try {
      const obj = Object.fromEntries(this.scrollHistory);
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      if (isDevMode()) console.error('[ScrollRestoration] Error saving history', e);
    }
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
