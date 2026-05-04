import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
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
import { getMobileMenuSections, MobileMenuSectionData, MobileMenuLink } from './mobile-menu.constants';
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
    MobileMenuSection
  ],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MobileMenu implements OnInit, OnDestroy, AfterViewInit {
  private directionService = inject(DirectionService);
  private menuService = inject(MenuService);
  private analyticsService = inject(AnalyticsService);
  private translate = inject(TranslateService);
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private ngZone = inject(NgZone);
  private cdRef = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  @Inject(PLATFORM_ID) private platformId = inject(PLATFORM_ID);

  public currentLang: string;
  private isBrowser: boolean;

  // Drawer state
  public menuTranslateX = -320;
  public menuScaleX = 1;
  public menuTransformOrigin = 'left';
  public menuTransition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
  private menuWidth = 320;
  private isAnimating = false;
  private drawerState: 'closed' | 'opening' | 'open' | 'closing' = 'closed';

  private menuElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private searchDebounceTimer: any;
  private gestureHandler: MobileMenuGestures | null = null;
  private gestureConfig: MobileMenuGestureConfig | null = null;
  private a11y: MobileMenuAccessibility;

  public currentYear = new Date().getFullYear();
  public searchQuery = '';
  public searchResultsCount = 0;

  public menuSections: MobileMenuSectionData[] = [];
  public expandedSections = new Set<string>();
  private expandedSectionsBeforeSearch: Set<string> | null = null;
  private translationCache = new Map<string, string>();
  public readonly menuTitleId = `mobile-menu-title-${Math.random().toString(36).slice(2, 10)}`;

  get isMobileMenuOpen() {
    return this.menuService.isMobileMenuOpen();
  }

  constructor() {
    this.currentLang = this.translate.getCurrentLang() || this.translate.defaultLang || 'es';
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.a11y = new MobileMenuAccessibility(this.el);

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

  private initMenuSections() {
    this.menuSections = getMobileMenuSections(this.currentLang);
    this.translationCache.clear();
  }

  ngOnInit() {
    // Logic if needed
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.initializeMenu();
      this.setupGestures();
      this.setupResizeObserver();
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private initializeMenu() {
    this.menuElement = this.el.nativeElement.querySelector('.header__nav-links-mobile');
    this.overlayElement = this.el.nativeElement.querySelector('.mobile-menu-overlay');

    if (this.menuElement) {
      this.updateMenuWidth();
    }
  }

  private setupResizeObserver() {
    if (!this.menuElement || !this.isBrowser) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === this.menuElement) {
          this.ngZone.run(() => {
            this.updateMenuWidth();
          });
        }
      }
    });

    this.resizeObserver.observe(this.menuElement);
  }

  private updateMenuWidth() {
    if (!this.menuElement) return;

    const newWidth = this.menuElement.offsetWidth || 320;
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

  private setupGestures() {
    this.gestureConfig = {
      menuWidth: this.menuWidth,
      elasticResistance: 100,
      edgeThreshold: 30, // Customizing threshold as per recommendation
      velocityThreshold: 0.25,
      isRtl: () => this.directionService.isRtl(),
      isOpen: () => this.isMobileMenuOpen,
      isAnimating: () => this.isAnimating,
      onUpdateTranslate: (translateX, progress, scaleX, transformOrigin) => {
        this.menuTranslateX = translateX;
        this.menuScaleX = scaleX ?? 1;
        this.menuTransformOrigin = transformOrigin ?? (this.directionService.isRtl() ? 'right' : 'left');

        if (progress !== null) {
          this.menuTransition = 'none';
          this.updateOverlayVisual(progress);
          if (this.menuElement) {
            this.renderer.addClass(this.menuElement, 'dragging');
          }
        } else {
          this.menuTransition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
          if (this.menuElement) {
            this.renderer.removeClass(this.menuElement, 'dragging');
          }
        }
        this.cdRef.markForCheck();
      },
      onOpen: () => {
        this.menuService.open();
      },
      onClose: () => {
        this.menuService.close();
      },
      onToggleHaptic: () => this.triggerHapticFeedback(),
      onTrackMetric: (metric, data) => {
        this.analyticsService.trackEvent(`mobile_menu_${metric}`, data);
      }
    };

    this.gestureHandler = new MobileMenuGestures(this.gestureConfig, this.ngZone);

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('pointerdown', this.gestureHandler!.handleWindowPointerDown);
    });
  }


  private clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }

  private updateOverlayVisual(progress: number) {
    if (!this.overlayElement) return;

    const normalized = this.clamp01(progress);
    const eased = 1 - Math.pow(1 - normalized, 2);
    const opacity = 0.08 + eased * 0.62;
    const blur = eased * 8;

    this.overlayElement.style.opacity = opacity.toFixed(3);
    this.overlayElement.style.backdropFilter = `blur(${blur.toFixed(2)}px)`;
  }

  private cleanup() {
    if (this.gestureHandler) {
      this.gestureHandler.destroy();
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    if (this.isMobileMenuOpen) {
      document.body.classList.remove('no-scroll');
      this.toggleBackgroundInert(false);
    }
  }



  private toggleBackgroundInert(isInert: boolean) {
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
  private openDrawer() {
    if (this.drawerState === 'open' || this.drawerState === 'opening') return;
    if (this.isAnimating && this.drawerState === 'closing') return;
    this.isAnimating = true;
    this.drawerState = 'opening';
    this.menuTransition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
    this.menuTranslateX = 0;
    this.menuScaleX = 1;

    if (this.isBrowser) {
      document.body.classList.add('no-scroll');
      this.toggleBackgroundInert(true);
      this.a11y.saveFocus();
      this.triggerHapticFeedback();
    }

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

  private closeDrawer() {
    if (this.drawerState === 'closed' || this.drawerState === 'closing') return;
    if (this.isAnimating && this.drawerState === 'opening') return;
    this.isAnimating = true;
    this.drawerState = 'closing';
    this.menuTransition = 'transform 0.4s cubic-bezier(0.4, 0.0, 0.2, 1)';
    this.menuTranslateX = this.directionService.isRtl() ? this.menuWidth : -this.menuWidth;
    this.menuScaleX = 1;

    if (this.isBrowser) {
      document.body.classList.remove('no-scroll');
      this.toggleBackgroundInert(false);
      this.triggerHapticFeedback();
      this.a11y.restoreFocus();
    }

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

  private handleTransitionEnd(callback: () => void) {
    if (!this.isBrowser || !this.menuElement) {
      callback();
      return;
    }

    const unlisten = this.renderer.listen(this.menuElement, 'transitionend', (event: TransitionEvent) => {
      if (event.propertyName === 'transform') {
        unlisten();
        this.ngZone.run(() => {
          callback();
        });
      }
    });

    // Fallback for cases where transition might not fire
    setTimeout(() => {
      unlisten();
      this.ngZone.run(() => {
        if (this.isAnimating) {
          callback();
        }
      });
    }, 500);
  }

  closeMobileMenu() {
    this.menuService.close();
  }

  private getTranslatedLowercase(key: string): string {
    const cached = this.translationCache.get(key);
    if (cached) return cached;

    const translated = this.translate.instant(key).toLowerCase();
    this.translationCache.set(key, translated);
    return translated;
  }

  shouldShowLink = (linkTextKey: string): boolean => {
    if (!this.searchQuery) return true;
    return this.getTranslatedLowercase(linkTextKey).includes(this.searchQuery.toLowerCase());
  }

  shouldShowSection(sectionKey: string, links: MobileMenuLink[]): boolean {
    if (!this.searchQuery) return true;

    const sectionTitle = this.getTranslatedLowercase(sectionKey);
    if (sectionTitle.includes(this.searchQuery.toLowerCase())) {
      return true;
    }

    return links.some(link => this.shouldShowLink(link.key));
  }

  toggleSection(section: string) {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
      this.analyticsService.trackEvent('mobile_menu_expand_section', {
        section_id: section
      });
    }
    this.cdRef.markForCheck();
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }

  onSearchChange(query: string) {
    const hadQuery = !!this.searchQuery;
    this.searchQuery = query;
    this.updateSearchResultsCount();

    // After search results change, we need to refresh the focus trap cache
    setTimeout(() => {
      this.a11y.refreshFocusableElements();
    }, 100);

    if (this.searchQuery) {
      if (!hadQuery) {
        this.expandedSectionsBeforeSearch = new Set(this.expandedSections);
        this.expandedSections.clear();
      }
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
      }

      this.searchDebounceTimer = setTimeout(() => {
        this.analyticsService.trackEvent('mobile_menu_search', {
          search_term: this.searchQuery,
          results_count: this.searchResultsCount
        });
      }, 300);

      let expandedCount = 0;
      for (const section of this.menuSections) {
        if (this.shouldShowSection(section.titleKey, section.links)) {
          if (expandedCount < 2) {
            this.expandedSections.add(section.id);
            expandedCount++;
          }
        }
      }
    } else if (hadQuery) {
      this.expandedSections = this.expandedSectionsBeforeSearch ?? new Set<string>();
      this.expandedSectionsBeforeSearch = null;
    }
    this.cdRef.markForCheck();
  }

  onMenuRouteNavigate(route: string[], source: string) {
    this.router.navigate(route).then((ok) => {
      if (!ok) {
        this.analyticsService.trackEvent('mobile_menu_navigation_failed', { source, route: route.join('/') });
      }
    }).catch(() => {
      this.analyticsService.trackEvent('mobile_menu_navigation_failed', { source, route: route.join('/') });
    });
    this.closeMobileMenu();
  }

  private updateSearchResultsCount() {
    if (!this.searchQuery) {
      this.searchResultsCount = 0;
      return;
    }

    let count = 0;
    for (const section of this.menuSections) {
      // Count individual matching links in each section
      section.links.forEach(link => {
        if (this.shouldShowLink(link.key)) {
          count++;
        }
      });
    }

    // Include contact button if it matches
    if (this.shouldShowLink('HEADER.CONTACT')) {
      count++;
    }

    this.searchResultsCount = count;
  }

  private triggerHapticFeedback() {
    if (!this.isBrowser || !navigator.vibrate) return;

    // Chrome blocks vibration when there is no user activation yet.
    if (navigator.userActivation && !navigator.userActivation.isActive) return;

    navigator.vibrate(5);
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
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

  onOverlayTouch(event: TouchEvent) {
    if (this.isAnimating) {
      this.stopTransition();
    }
    if (this.isMobileMenuOpen && (!this.gestureHandler || !this.gestureHandler.getIsDragging())) {
      event.preventDefault();
      event.stopPropagation();
      this.closeMobileMenu();
    }
  }

  private stopTransition() {
    this.isAnimating = false;
    this.menuTransition = 'none';
    if (this.menuElement) {
      // Forcing reflow to stop transition immediately
      void this.menuElement.offsetHeight;
    }
    this.cdRef.markForCheck();
  }

  onMenuPointerDown(event: PointerEvent) {
    if (this.isAnimating) {
      this.stopTransition();
    }
    if (this.gestureHandler) {
      this.gestureHandler.onMenuPointerDown(event);
    }
  }

  onMenuPointerMove(event: PointerEvent) {
    if (this.gestureHandler) {
      this.gestureHandler.onMenuPointerMove(event);
    }
  }

  onMenuPointerEnd(event: PointerEvent) {
    if (this.gestureHandler) {
      this.gestureHandler.onMenuPointerEnd(event);
    }
  }

  onMenuPointerCancel(event: PointerEvent) {
    if (this.gestureHandler) {
      this.gestureHandler.onMenuPointerCancel(event);
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent) {
    // Keep this to prevent default scroll on touch devices when dragging
    if (this.gestureHandler && this.gestureHandler.getIsDragging() && this.gestureHandler.getIsHorizontalGesture() && this.isBrowser) {
      event.preventDefault();
    }
  }
}
