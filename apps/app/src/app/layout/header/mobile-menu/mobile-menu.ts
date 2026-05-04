import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewEncapsulation,
  PLATFORM_ID,
  OnInit,
  OnDestroy,
  Renderer2,
  NgZone,
  AfterViewInit,
  ChangeDetectorRef,
  inject,
  HostListener,
  effect,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { DirectionService } from '@core/services/direction.service';
import { MenuService } from '@core/services/menu.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { MobileMenuGestures, MobileMenuGestureConfig } from './mobile-menu-gestures';
import { MobileMenuQuickAccess } from './mobile-menu-quick-access';
import { MobileMenuSearch } from './mobile-menu-search';
import { MobileMenuSection } from './mobile-menu-section';
import {
  getMobileMenuSections,
  MobileMenuSectionData,
  MobileMenuLink,
  MOBILE_MENU_MAX_WIDTH,
  DRAWER_TRANSITION,
  DRAWER_TRANSITION_DURATION_MS,
  GESTURE_EDGE_THRESHOLD,
  GESTURE_VELOCITY_THRESHOLD,
  GESTURE_ELASTIC_RESISTANCE,
} from './mobile-menu.constants';
import { MobileMenuAccessibility } from './mobile-menu-accessibility';

@Component({
  selector: 'jsl-mobile-menu',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    FormsModule,
    TranslateModule,
    LucideAngularModule,
    MobileMenuQuickAccess,
    MobileMenuSearch,
    MobileMenuSection,
  ],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MobileMenu implements OnInit, OnDestroy, AfterViewInit {
  private directionService = inject(DirectionService);
  private menuService      = inject(MenuService);
  private analyticsService = inject(AnalyticsService);
  private translate        = inject(TranslateService);
  private el               = inject(ElementRef);
  private renderer         = inject(Renderer2);
  private ngZone           = inject(NgZone);
  private cdRef            = inject(ChangeDetectorRef);
  private destroyRef       = inject(DestroyRef);
  private router           = inject(Router);
  // P10 — functional inject(); @Inject() decorator was redundant and removed
  private platformId       = inject(PLATFORM_ID);

  public currentLang: string;
  private isBrowser: boolean;

  // ── Drawer animation state ──────────────────────────────────────────────────
  // P8 — use MOBILE_MENU_MAX_WIDTH to guarantee the drawer is always fully off-screen
  //      before ngAfterViewInit measures the real width.
  public menuTranslateX  = -MOBILE_MENU_MAX_WIDTH;
  public menuScaleX      = 1;
  public menuTransformOrigin = 'left';
  public menuTransition  = DRAWER_TRANSITION;  // P5 — single constant, not repeated strings
  private menuWidth      = MOBILE_MENU_MAX_WIDTH;
  private isAnimating    = false;
  private drawerState: 'closed' | 'opening' | 'open' | 'closing' = 'closed';

  // ── DOM references ──────────────────────────────────────────────────────────
  private menuElement:    HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // ── P2 — single, cancellable transitionend listener + fallback timer ─────────
  private transitionEndUnlisten: (() => void) | null = null;
  private transitionFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Search / debounce ────────────────────────────────────────────────────────
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;  // P11 — typed

  // ── Gesture handler ─────────────────────────────────────────────────────────
  private gestureHandler: MobileMenuGestures | null = null;
  private gestureConfig: MobileMenuGestureConfig | null = null;
  private a11y: MobileMenuAccessibility;

  // ── View data ────────────────────────────────────────────────────────────────
  public currentYear = new Date().getFullYear();
  public searchQuery = '';
  public searchResultsCount = 0;
  public menuSections: MobileMenuSectionData[] = [];
  public expandedSections = new Set<string>();
  private expandedSectionsBeforeSearch: Set<string> | null = null;
  private translationCache = new Map<string, string>();
  public readonly menuTitleId = `mobile-menu-title-${Math.random().toString(36).slice(2, 10)}`;

  // ── Computed state accessors ─────────────────────────────────────────────────

  get isMobileMenuOpen(): boolean {
    return this.menuService.isMobileMenuOpen();
  }

  /** P7 — used in template to hide the closed drawer from the accessibility tree. */
  get isDrawerClosed(): boolean {
    return this.drawerState === 'closed';
  }

  constructor() {
    this.currentLang = this.translate.getCurrentLang() || this.translate.defaultLang || 'es';
    this.isBrowser   = isPlatformBrowser(this.platformId);
    this.a11y        = new MobileMenuAccessibility(this.el);

    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      this.currentLang = event.lang;
      this.initMenuSections();
      this.cdRef.markForCheck();
    });

    effect(() => {
      const isOpen = this.menuService.isMobileMenuOpen();
      if (isOpen) {
        this.openDrawer();
      } else {
        this.closeDrawer();
      }
    });

    this.initMenuSections();
  }

  private initMenuSections(): void {
    this.menuSections = getMobileMenuSections(this.currentLang);
    this.translationCache.clear();
  }

  ngOnInit(): void { /* reserved */ }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      this.initializeMenu();
      this.setupGestures();
      this.setupResizeObserver();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  // ── Initialisation ──────────────────────────────────────────────────────────

  private initializeMenu(): void {
    this.menuElement    = this.el.nativeElement.querySelector('.header__nav-links-mobile');
    this.overlayElement = this.el.nativeElement.querySelector('.mobile-menu-overlay');

    if (this.menuElement) {
      this.updateMenuWidth();
    }
  }

  private setupResizeObserver(): void {
    if (!this.menuElement || !this.isBrowser) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.menuElement) {
          this.ngZone.run(() => this.updateMenuWidth());
        }
      }
    });

    this.resizeObserver.observe(this.menuElement);
  }

  private updateMenuWidth(): void {
    if (!this.menuElement) return;

    const newWidth = this.menuElement.offsetWidth || MOBILE_MENU_MAX_WIDTH;
    if (this.menuWidth === newWidth) return;

    this.menuWidth = newWidth;

    if (this.gestureConfig) {
      this.gestureConfig.menuWidth = this.menuWidth;
    }

    if (this.drawerState === 'closed') {
      this.menuTranslateX = this.directionService.isRtl() ? this.menuWidth : -this.menuWidth;
    }

    this.cdRef.markForCheck();
  }

  private setupGestures(): void {
    this.gestureConfig = {
      menuWidth:          this.menuWidth,
      elasticResistance:  GESTURE_ELASTIC_RESISTANCE,
      edgeThreshold:      GESTURE_EDGE_THRESHOLD,
      velocityThreshold:  GESTURE_VELOCITY_THRESHOLD,
      isRtl:        () => this.directionService.isRtl(),
      isOpen:       () => this.isMobileMenuOpen,
      isAnimating:  () => this.isAnimating,
      // P3 — exposes current visual position so mid-animation gestures start correctly
      getCurrentTranslateX: () => this.menuTranslateX,

      onUpdateTranslate: (translateX, progress, scaleX, transformOrigin) => {
        this.menuTranslateX     = translateX;
        this.menuScaleX         = scaleX ?? 1;
        this.menuTransformOrigin = transformOrigin ?? (this.directionService.isRtl() ? 'right' : 'left');

        if (progress !== null) {
          // During active drag: disable CSS transition so motion tracks the finger
          this.menuTransition = 'none';
          this.updateOverlayVisual(progress); // P1 — overlay opacity tracks drag
          if (this.menuElement) this.renderer.addClass(this.menuElement, 'dragging');
        } else {
          // Drag released: re-enable transition for the snap animation
          this.menuTransition = DRAWER_TRANSITION;
          if (this.menuElement) this.renderer.removeClass(this.menuElement, 'dragging');
        }
        this.cdRef.markForCheck();
      },

      onOpen:  () => this.menuService.open(),
      onClose: () => this.menuService.close(),
      onToggleHaptic: () => this.triggerHapticFeedback(),
      onTrackMetric:  (metric, data) => this.analyticsService.trackEvent(`mobile_menu_${metric}`, data),
    };

    this.gestureHandler = new MobileMenuGestures(this.gestureConfig, this.ngZone);

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('pointerdown', this.gestureHandler!.handleWindowPointerDown);
    });
  }

  // ── Open / close drawer ─────────────────────────────────────────────────────

  private openDrawer(): void {
    if (this.drawerState === 'open' || this.drawerState === 'opening') return;
    if (this.isAnimating && this.drawerState === 'closing') return;

    this.isAnimating  = true;
    this.drawerState  = 'opening';
    this.menuTransition = DRAWER_TRANSITION;
    this.menuTranslateX = 0;
    this.menuScaleX     = 1;

    if (this.isBrowser) {
      document.body.classList.add('no-scroll');
      this.toggleBackgroundInert(true);
      this.a11y.saveFocus();
      this.triggerHapticFeedback();
    }

    // P1 / P4 — overlay is always in DOM (no display:none); just enable pointer-events
    if (this.overlayElement) {
      this.overlayElement.classList.add('visible');
      this.updateOverlayVisual(1);
    }

    this.cdRef.markForCheck();

    this.handleTransitionEnd(() => {
      this.isAnimating = false;
      this.drawerState = 'open';
      this.a11y.refreshFocusableElements();
      this.a11y.setInitialFocus();
      this.cdRef.markForCheck();
    });
  }

  private closeDrawer(): void {
    if (this.drawerState === 'closed' || this.drawerState === 'closing') return;
    if (this.isAnimating && this.drawerState === 'opening') return;

    this.isAnimating  = true;
    this.drawerState  = 'closing';
    this.menuTransition = DRAWER_TRANSITION;
    this.menuTranslateX = this.directionService.isRtl() ? this.menuWidth : -this.menuWidth;
    this.menuScaleX     = 1;

    if (this.isBrowser) {
      document.body.classList.remove('no-scroll');
      this.toggleBackgroundInert(false);
      this.triggerHapticFeedback();
      this.a11y.restoreFocus();
    }

    // P4 — clear inline styles so CSS transition fades opacity from current value → 0
    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
      this.overlayElement.style.opacity = '';
      this.overlayElement.style.backdropFilter = '';
    }

    this.cdRef.markForCheck();

    this.handleTransitionEnd(() => {
      this.isAnimating = false;
      this.drawerState = 'closed';
      this.cdRef.markForCheck();
    });
  }

  // ── Transition lifecycle (P2) ────────────────────────────────────────────────

  private clearTransitionListeners(): void {
    if (this.transitionEndUnlisten) {
      this.transitionEndUnlisten();
      this.transitionEndUnlisten = null;
    }
    if (this.transitionFallbackTimer !== null) {
      clearTimeout(this.transitionFallbackTimer);
      this.transitionFallbackTimer = null;
    }
  }

  private handleTransitionEnd(callback: () => void): void {
    // P2 — cancel any stale listener/timer before registering a new one,
    // so interrupted animations never fire old callbacks on the next transition.
    this.clearTransitionListeners();

    if (!this.isBrowser || !this.menuElement) {
      callback();
      return;
    }

    const unlisten = this.renderer.listen(
      this.menuElement,
      'transitionend',
      (event: TransitionEvent) => {
        if (event.propertyName !== 'transform') return;
        this.clearTransitionListeners();
        this.ngZone.run(() => callback());
      }
    );
    this.transitionEndUnlisten = unlisten;

    // Fallback: if transitionend never fires (e.g. prefers-reduced-motion suppresses it)
    this.transitionFallbackTimer = setTimeout(() => {
      this.transitionFallbackTimer = null;
      if (this.transitionEndUnlisten) {
        this.transitionEndUnlisten();
        this.transitionEndUnlisten = null;
      }
      this.ngZone.run(() => {
        if (this.isAnimating) callback();
      });
    }, DRAWER_TRANSITION_DURATION_MS + 100);
  }

  // ── Overlay helpers ─────────────────────────────────────────────────────────

  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private updateOverlayVisual(progress: number): void {
    if (!this.overlayElement) return;
    const normalized = this.clamp01(progress);
    const eased      = 1 - Math.pow(1 - normalized, 2);
    // P1 — inline opacity is set directly; the overlay is always in the DOM
    //      so this is immediately visible during edge-swipe gestures too.
    this.overlayElement.style.opacity        = (0.08 + eased * 0.62).toFixed(3);
    this.overlayElement.style.backdropFilter = `blur(${(eased * 8).toFixed(2)}px)`;
  }

  // ── Background inert management ─────────────────────────────────────────────

  private toggleBackgroundInert(isInert: boolean): void {
    if (!this.isBrowser) return;
    const targets = Array.from(document.querySelectorAll('main, jsl-footer, .header__nav, jsl-top-bar'));
    for (const target of targets) {
      if (isInert) {
        target.setAttribute('inert', '');
        target.setAttribute('aria-hidden', 'true');
      } else {
        target.removeAttribute('inert');
        target.removeAttribute('aria-hidden');
      }
    }
  }

  // ── Public menu actions ─────────────────────────────────────────────────────

  closeMobileMenu(): void {
    this.menuService.close();
  }

  // ── Pointer event delegation ────────────────────────────────────────────────

  onMenuPointerDown(event: PointerEvent): void {
    if (this.isAnimating) this.stopTransition();
    this.gestureHandler?.onMenuPointerDown(event);
  }

  onMenuPointerMove(event: PointerEvent): void {
    this.gestureHandler?.onMenuPointerMove(event);
  }

  onMenuPointerEnd(event: PointerEvent): void {
    this.gestureHandler?.onMenuPointerEnd(event);
  }

  onMenuPointerCancel(event: PointerEvent): void {
    this.gestureHandler?.onMenuPointerCancel(event);
  }

  private stopTransition(): void {
    this.isAnimating    = false;
    this.menuTransition = 'none';
    if (this.menuElement) void this.menuElement.offsetHeight; // force reflow
    this.cdRef.markForCheck();
  }

  // ── Overlay touch handler ───────────────────────────────────────────────────

  onOverlayTouch(event: TouchEvent): void {
    if (this.isAnimating) this.stopTransition();
    if (this.isMobileMenuOpen && !this.gestureHandler?.getIsDragging()) {
      event.preventDefault();
      event.stopPropagation();
      this.closeMobileMenu();
    }
  }

  // ── Keyboard events ─────────────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isBrowser || !this.isMobileMenuOpen) return;

    if (event.key === 'Escape') {
      this.closeMobileMenu();
      event.preventDefault();
      return;
    }

    if (event.key === 'Tab') {
      this.a11y.trapFocus(event);
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent): void {
    if (this.gestureHandler?.getIsDragging() && this.gestureHandler.getIsHorizontalGesture() && this.isBrowser) {
      event.preventDefault();
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  private getTranslatedLowercase(key: string): string {
    const cached = this.translationCache.get(key);
    if (cached !== undefined) return cached;
    const translated = this.translate.instant(key).toLowerCase();
    this.translationCache.set(key, translated);
    return translated;
  }

  shouldShowLink = (linkTextKey: string): boolean => {
    if (!this.searchQuery) return true;
    return this.getTranslatedLowercase(linkTextKey).includes(this.searchQuery.toLowerCase());
  };

  shouldShowSection(sectionKey: string, links: MobileMenuLink[]): boolean {
    if (!this.searchQuery) return true;
    if (this.getTranslatedLowercase(sectionKey).includes(this.searchQuery.toLowerCase())) return true;
    return links.some(link => this.shouldShowLink(link.key));
  }

  onSearchChange(query: string): void {
    const hadQuery = !!this.searchQuery;
    this.searchQuery = query;
    this.updateSearchResultsCount();

    setTimeout(() => this.a11y.refreshFocusableElements(), 100);

    if (this.searchQuery) {
      if (!hadQuery) {
        this.expandedSectionsBeforeSearch = new Set(this.expandedSections);
        this.expandedSections.clear();
      }

      if (this.searchDebounceTimer !== null) clearTimeout(this.searchDebounceTimer);

      this.searchDebounceTimer = setTimeout(() => {
        this.analyticsService.trackEvent('mobile_menu_search', {
          search_term:   this.searchQuery,
          results_count: this.searchResultsCount,
        });
      }, 300);

      let expandedCount = 0;
      for (const section of this.menuSections) {
        if (this.shouldShowSection(section.titleKey, section.links) && expandedCount < 2) {
          this.expandedSections.add(section.id);
          expandedCount++;
        }
      }
    } else if (hadQuery) {
      this.expandedSections = this.expandedSectionsBeforeSearch ?? new Set<string>();
      this.expandedSectionsBeforeSearch = null;
    }

    this.cdRef.markForCheck();
  }

  private updateSearchResultsCount(): void {
    if (!this.searchQuery) {
      this.searchResultsCount = 0;
      return;
    }

    let count = 0;
    for (const section of this.menuSections) {
      section.links.forEach(link => { if (this.shouldShowLink(link.key)) count++; });
    }
    if (this.shouldShowLink('HEADER.CONTACT')) count++;
    this.searchResultsCount = count;
  }

  // ── Sections ────────────────────────────────────────────────────────────────

  toggleSection(section: string): void {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
      this.analyticsService.trackEvent('mobile_menu_expand_section', { section_id: section });
    }
    this.cdRef.markForCheck();
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

  onMenuRouteNavigate(route: string[], source: string): void {
    this.router.navigate(route).then((ok) => {
      if (!ok) {
        this.analyticsService.trackEvent('mobile_menu_navigation_failed', { source, route: route.join('/') });
      }
    }).catch(() => {
      this.analyticsService.trackEvent('mobile_menu_navigation_failed', { source, route: route.join('/') });
    });
    this.closeMobileMenu();
  }

  // ── Haptic feedback ─────────────────────────────────────────────────────────

  private triggerHapticFeedback(): void {
    if (!this.isBrowser || !navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.isActive) return;
    navigator.vibrate(5);
  }

  // ── Cleanup ─────────────────────────────────────────────────────────────────

  private cleanup(): void {
    this.gestureHandler?.destroy();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.clearTransitionListeners();

    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    if (this.isMobileMenuOpen) {
      document.body.classList.remove('no-scroll');
      this.toggleBackgroundInert(false);
    }
  }
}
