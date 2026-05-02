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
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { DirectionService } from '@core/services/direction.service';
import { MenuService } from '@core/services/menu.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { MobileMenuGestures, MobileMenuGestureConfig } from './mobile-menu-gestures';

@Component({
  selector: 'jsl-mobile-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TranslateModule, LucideAngularModule],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
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
  private lastFocusedElement: HTMLElement | null = null;
  private searchDebounceTimer: any;
  private gestureHandler: MobileMenuGestures | null = null;

  public currentYear = new Date().getFullYear();
  public searchQuery = '';
  public searchResultsCount = 0;

  get isMobileMenuOpen() {
    return this.menuService.isMobileMenuOpen();
  }

  constructor() {
    this.currentLang = this.translate.getCurrentLang() || this.translate.defaultLang || 'es';
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
    });

    effect(() => {
      const isOpen = this.menuService.isMobileMenuOpen();
      if (isOpen) {
        this.openDrawer();
      } else {
        this.closeDrawer();
      }
    });
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
      this.cdRef.detectChanges();
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
        this.cdRef.detectChanges();
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
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.menuTransition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    this.menuTranslateX = 0;

    if (this.isBrowser) {
      document.body.classList.add('no-scroll');
      this.lastFocusedElement = document.activeElement as HTMLElement;
      this.triggerHapticFeedback();
    }

    if (this.overlayElement) {
      this.overlayElement.classList.add('visible');
      this.overlayElement.style.opacity = '';
    }

    this.cdRef.detectChanges();

    setTimeout(() => {
      this.isAnimating = false;
      const closeBtn = this.el.nativeElement.querySelector('.mobile-close-btn');
      if (closeBtn) {
        (closeBtn as HTMLElement).focus();
      }
    }, 300);
  }

  private closeDrawer() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.menuTransition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    this.menuTranslateX = this.directionService.isRtl() ? this.menuWidth : -this.menuWidth;

    if (this.isBrowser) {
      document.body.classList.remove('no-scroll');
      this.triggerHapticFeedback();
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
    }

    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
      this.overlayElement.style.opacity = '';
    }

    this.cdRef.detectChanges();

    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }

  closeMobileMenu() {
    this.menuService.close();
  }

  shouldShowLink(linkTextKey: string): boolean {
    if (!this.searchQuery) return true;
    const translatedText = this.translate.instant(linkTextKey).toLowerCase();
    return translatedText.includes(this.searchQuery.toLowerCase());
  }

  shouldShowSection(sectionKey: string, links: string[]): boolean {
    if (!this.searchQuery) return true;

    const sectionTitle = this.translate.instant(sectionKey).toLowerCase();
    if (sectionTitle.includes(this.searchQuery.toLowerCase())) {
      return true;
    }

    return links.some(linkKey => this.shouldShowLink(linkKey));
  }

  public expandedSections = new Set<string>();

  toggleSection(section: string) {
    if (this.expandedSections.has(section)) {
      this.expandedSections.delete(section);
    } else {
      this.expandedSections.add(section);
      this.analyticsService.trackEvent('mobile_menu_expand_section', {
        section_id: section
      });
    }
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections.has(section);
  }

  onSearchChange() {
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

      const sections = [
        { id: 'services', title: 'HEADER.SERVICES', links: ['HEADER.VIEW_ALL_SERVICES', 'SERVICES_LIST.WEB', 'SERVICES_LIST.MOBILE', 'SERVICES_LIST.DESKTOP', 'SERVICES_LIST.CLOUD', 'HEADER.INDUSTRIES'] },
        { id: 'products', title: 'HEADER.PRODUCTS', links: ['HEADER.VIEW_ALL_PRODUCTS', 'PRODUCTS_LIST.ERP', 'PRODUCTS_LIST.POS', 'PRODUCTS_LIST.MOBILE', 'HEADER.VIRTEEX_ECOSYSTEM', 'HEADER.PRICING'] },
        { id: 'company', title: 'FOOTER.COMPANY', links: ['HEADER.ABOUT', 'HEADER.PROCESS', 'HEADER.TECH_STACK', 'HEADER.CAREERS', 'HEADER.PARTNERS', 'HEADER.LIFE_AT_JSL', 'HEADER.INVESTORS', 'HEADER.VENTURES', 'HEADER.SECURITY'] },
        { id: 'resources', title: 'FOOTER.RESOURCES', links: ['HEADER.PROJECTS', 'HEADER.BLOG', 'HEADER.EVENTS', 'HEADER.NEWS', 'HEADER.PRESS', 'HEADER.ROADMAP', 'HEADER.FAQ', 'HEADER.DEVELOPERS'] },
        { id: 'login', title: 'HEADER.LOGIN', links: ['HEADER.LOGIN_VIRTEEX', 'HEADER.LOGIN_CLIENT', 'HEADER.LOGIN_SUPPORT'] }
      ];

      let expandedCount = 0;
      for (const section of sections) {
        if (this.shouldShowSection(section.title, section.links)) {
          if (expandedCount < 3) {
            this.expandedSections.add(section.id);
            expandedCount++;
          }
        }
      }
    }
  }

  private updateSearchResultsCount() {
    if (!this.searchQuery) {
      this.searchResultsCount = 0;
      return;
    }

    let count = 0;
    const sections = [
      { title: 'HEADER.SERVICES', links: ['HEADER.VIEW_ALL_SERVICES', 'SERVICES_LIST.WEB', 'SERVICES_LIST.MOBILE', 'SERVICES_LIST.DESKTOP', 'SERVICES_LIST.CLOUD', 'HEADER.INDUSTRIES'] },
      { title: 'HEADER.PRODUCTS', links: ['HEADER.VIEW_ALL_PRODUCTS', 'PRODUCTS_LIST.ERP', 'PRODUCTS_LIST.POS', 'PRODUCTS_LIST.MOBILE', 'HEADER.VIRTEEX_ECOSYSTEM', 'HEADER.PRICING'] },
      { title: 'FOOTER.COMPANY', links: ['HEADER.ABOUT', 'HEADER.PROCESS', 'HEADER.TECH_STACK', 'HEADER.CAREERS', 'HEADER.PARTNERS', 'HEADER.LIFE_AT_JSL', 'HEADER.INVESTORS', 'HEADER.VENTURES', 'HEADER.SECURITY'] },
      { title: 'FOOTER.RESOURCES', links: ['HEADER.PROJECTS', 'HEADER.BLOG', 'HEADER.EVENTS', 'HEADER.NEWS', 'HEADER.PRESS', 'HEADER.ROADMAP', 'HEADER.FAQ', 'HEADER.DEVELOPERS'] },
      { title: 'HEADER.LOGIN', links: ['HEADER.LOGIN_VIRTEEX', 'HEADER.LOGIN_CLIENT', 'HEADER.LOGIN_SUPPORT'] }
    ];

    for (const section of sections) {
      if (this.shouldShowSection(section.title, section.links)) {
        count++;
      }
    }

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
      this.trapFocus(event);
    }
  }

  private trapFocus(event: KeyboardEvent) {
    const focusableSelectors =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const focusableElements = Array.from(
      this.el.nativeElement.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

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
