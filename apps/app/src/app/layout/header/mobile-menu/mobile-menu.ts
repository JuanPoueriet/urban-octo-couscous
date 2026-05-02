import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  Inject,
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
  ViewEncapsulation,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  @Inject(PLATFORM_ID) private platformId = inject(PLATFORM_ID);

  public currentLang: string;
  private isBrowser: boolean;

  // Drawer state
  public menuTranslateX = -320;
  public menuTransition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
  private menuWidth = 320;
  private isAnimating = false;

  private menuElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private searchDebounceTimer: any;
  private gestureHandler: MobileMenuGestures | null = null;
  private a11y: MobileMenuAccessibility;

  public currentYear = new Date().getFullYear();
  public searchQuery = '';
  public searchResultsCount = 0;

  public menuSections: MobileMenuSectionData[] = [];
  public expandedSections = new Set<string>();

  get isMobileMenuOpen() {
    return this.menuService.isMobileMenuOpen();
  }

  constructor() {
    this.currentLang = this.translate.getCurrentLang() || this.translate.defaultLang || 'es';
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.a11y = new MobileMenuAccessibility(this.el);

    this.translate.onLangChange.pipe(takeUntilDestroyed()).subscribe((event) => {
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
    // Expand Top Tasks by default
    this.expandedSections.add('top-tasks');
  }

  ngOnInit() {
    // Logic if needed
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.initializeMenu();
      this.setupGestures();
    }
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private initializeMenu() {
    this.menuElement = this.el.nativeElement.querySelector('.header__nav-links-mobile');
    this.overlayElement = this.el.nativeElement.querySelector('.mobile-menu-overlay');

    if (this.menuElement) {
      this.menuWidth = this.menuElement.offsetWidth || 320;
      this.menuTranslateX = this.directionService.isRtl() ? this.menuWidth : -this.menuWidth;
      this.cdRef.markForCheck();
    }
  }

  private setupGestures() {
    const config: MobileMenuGestureConfig = {
      menuWidth: this.menuWidth,
      isRtl: () => this.directionService.isRtl(),
      isOpen: () => this.isMobileMenuOpen,
      isAnimating: () => this.isAnimating,
      onUpdateTranslate: (translateX, progress) => {
        this.menuTranslateX = translateX;
        this.menuTransition = 'none';
        if (this.overlayElement && progress !== null) {
          this.overlayElement.style.opacity = Math.max(0, Math.min(1, progress * 0.7)).toString();
        }
        this.cdRef.markForCheck();
      },
      onOpen: () => this.menuService.open(),
      onClose: () => this.menuService.close(),
      onToggleHaptic: () => this.triggerHapticFeedback()
    };

    this.gestureHandler = new MobileMenuGestures(config, this.ngZone);

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('touchstart', this.gestureHandler!.handleWindowTouchStart, {
        passive: false,
      });
    });
  }

  private cleanup() {
    if (this.gestureHandler) {
      this.gestureHandler.destroy();
    }

    if (this.isMobileMenuOpen) {
       document.body.classList.remove('no-scroll');
    }
  }

  private openDrawer() {
    this.isAnimating = true;
    this.menuTransition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    this.menuTranslateX = 0;

    if (this.isBrowser) {
      document.body.classList.add('no-scroll');
      this.toggleBackgroundInert(true);
      this.a11y.saveFocus();
      this.triggerHapticFeedback();
    }

    if (this.overlayElement) {
      this.overlayElement.classList.add('visible');
      this.overlayElement.style.opacity = '';
    }

    this.cdRef.markForCheck();

    this.handleTransitionEnd(() => {
      this.isAnimating = false;
      // Re-verify state after animation in case it was closed rapidly
      if (!this.menuService.isMobileMenuOpen()) {
        this.closeDrawer();
      } else {
        this.a11y.setInitialFocus();
      }
      this.cdRef.markForCheck();
    });
  }

  private closeDrawer() {
    this.isAnimating = true;
    this.menuTransition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    this.menuTranslateX = this.directionService.isRtl() ? this.menuWidth : -this.menuWidth;

    if (this.isBrowser) {
      document.body.classList.remove('no-scroll');
      this.toggleBackgroundInert(false);
      this.triggerHapticFeedback();
      this.a11y.restoreFocus();
    }

    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
      this.overlayElement.style.opacity = '';
    }

    this.cdRef.markForCheck();

    this.handleTransitionEnd(() => {
      this.isAnimating = false;
      // Re-verify state
      if (this.menuService.isMobileMenuOpen()) {
        this.openDrawer();
      }
      this.cdRef.markForCheck();
    });
  }

  private toggleBackgroundInert(isInert: boolean) {
    if (!this.isBrowser) return;

    // Use querySelector via renderer if possible or document as a fallback for high-level elements
    const mainContent = document.querySelector('.main-content');
    const footer = document.querySelector('jsl-footer');

    const elementsToInert: HTMLElement[] = [];
    if (mainContent) elementsToInert.push(mainContent as HTMLElement);
    if (footer) elementsToInert.push(footer as HTMLElement);

    // Also siblings of the root app component or the header container to ensure full coverage
    const bodyChildren = Array.from(document.body.children);
    bodyChildren.forEach((el) => {
      // Don't inert the root itself if it contains the menu, but inert other top-level elements
      if (el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && !el.contains(this.el.nativeElement)) {
        elementsToInert.push(el as HTMLElement);
      }
    });

    elementsToInert.forEach((el) => {
      if (isInert) {
        this.renderer.setAttribute(el, 'inert', '');
        this.renderer.setAttribute(el, 'aria-hidden', 'true');
      } else {
        this.renderer.removeAttribute(el, 'inert');
        this.renderer.removeAttribute(el, 'aria-hidden');
      }
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
    }, 400);
  }

  closeMobileMenu() {
    this.menuService.close();
  }

  shouldShowLink = (linkTextKey: string): boolean => {
    if (!this.searchQuery) return true;
    const translatedText = this.translate.instant(linkTextKey).toLowerCase();
    return translatedText.includes(this.searchQuery.toLowerCase());
  }

  shouldShowSection(sectionKey: string, links: MobileMenuLink[]): boolean {
    if (!this.searchQuery) return true;

    const sectionTitle = this.translate.instant(sectionKey).toLowerCase();
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
    this.searchQuery = query;
    this.updateSearchResultsCount();

    if (this.searchQuery) {
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
          if (expandedCount < 1) { // Limit to 1 expanded section during search to reduce noise
            this.expandedSections.add(section.id);
            expandedCount++;
          }
        }
      }
    }
    this.cdRef.markForCheck();
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
    if (this.isBrowser && navigator.vibrate) {
      navigator.vibrate(5);
    }
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
    if (this.isMobileMenuOpen && (!this.gestureHandler || !this.gestureHandler.getIsDragging())) {
      event.preventDefault();
      event.stopPropagation();
      this.closeMobileMenu();
    }
  }

  onMenuTouchStart(event: TouchEvent) {
    if (this.gestureHandler) {
      this.gestureHandler.onMenuTouchStart(event);
    }
  }

  onMenuTouchMove(event: TouchEvent) {
    if (this.gestureHandler) {
      this.gestureHandler.onMenuTouchMove(event);
    }
  }

  onMenuTouchEnd(event: TouchEvent) {
    if (this.gestureHandler) {
      this.gestureHandler.onMenuTouchEnd();
    }
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent) {
    if (this.gestureHandler && this.gestureHandler.getIsDragging() && this.gestureHandler.getIsHorizontalGesture() && this.isBrowser) {
      event.preventDefault();
    }
  }
}
