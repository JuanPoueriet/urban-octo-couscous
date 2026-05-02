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
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { DirectionService } from '@core/services/direction.service';
import { MenuService } from '@core/services/menu.service';
import { AnalyticsService } from '@core/services/analytics.service';
import { MobileMenuGestures, MobileMenuGestureConfig } from './mobile-menu-gestures';
import { MobileMenuQuickAccess } from './mobile-menu-quick-access';
import { MobileMenuSearch } from './mobile-menu-search';
import { MobileMenuSection, MobileMenuLink } from './mobile-menu-section';

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
  private searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  private gestureHandler: MobileMenuGestures | null = null;

  public currentYear = new Date().getFullYear();
  public searchQuery = '';
  public searchResultsCount = 0;

  public menuSections: { id: string; titleKey: string; links: MobileMenuLink[] }[] = [];

  get isMobileMenuOpen() {
    return this.menuService.isMobileMenuOpen();
  }

  constructor() {
    this.currentLang = this.translate.getCurrentLang() || this.translate.defaultLang || 'es';
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
      this.initMenuSections();
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
    this.menuSections = [
      {
        id: 'services',
        titleKey: 'HEADER.SERVICES',
        links: [
          { key: 'HEADER.VIEW_ALL_SERVICES', route: [this.currentLang, 'solutions'], icon: 'LayoutGrid' },
          { key: 'SERVICES_LIST.WEB', route: [this.currentLang, 'solutions', 'web-development'], icon: 'Monitor' },
          { key: 'SERVICES_LIST.MOBILE', route: [this.currentLang, 'solutions', 'mobile-apps'], icon: 'Smartphone' },
          { key: 'SERVICES_LIST.DESKTOP', route: [this.currentLang, 'solutions', 'desktop-software'], icon: 'Laptop' },
          { key: 'SERVICES_LIST.CLOUD', route: [this.currentLang, 'solutions', 'cloud-architecture'], icon: 'CloudCog' },
          { key: 'HEADER.INDUSTRIES', route: [this.currentLang, 'industries'], icon: 'Building2' },
        ]
      },
      {
        id: 'products',
        titleKey: 'HEADER.PRODUCTS',
        links: [
          { key: 'HEADER.VIEW_ALL_PRODUCTS', route: [this.currentLang, 'products'], icon: 'Package' },
          { key: 'PRODUCTS_LIST.ERP', href: 'https://virtex.com', icon: 'ExternalLink' },
          { key: 'PRODUCTS_LIST.POS', href: 'https://pos.jsl.technology', icon: 'ExternalLink' },
          { key: 'PRODUCTS_LIST.MOBILE', href: 'https://apps.jsl.technology', icon: 'ExternalLink' },
          { key: 'HEADER.VIRTEEX_ECOSYSTEM', route: [this.currentLang, 'virteex-ecosystem'], icon: 'Layers' },
          { key: 'HEADER.PRICING', route: [this.currentLang, 'pricing'], icon: 'CircleDollarSign' },
        ]
      },
      {
        id: 'company',
        titleKey: 'FOOTER.COMPANY',
        links: [
          { key: 'HEADER.ABOUT', route: [this.currentLang, 'about-us'], icon: 'Users' },
          { key: 'HEADER.PROCESS', route: [this.currentLang, 'process'], icon: 'Workflow' },
          { key: 'HEADER.TECH_STACK', route: [this.currentLang, 'tech-stack'], icon: 'Cpu' },
          { key: 'HEADER.CAREERS', route: [this.currentLang, 'careers'], icon: 'Briefcase' },
          { key: 'HEADER.PARTNERS', route: [this.currentLang, 'partners'], icon: 'Users' },
          { key: 'HEADER.LIFE_AT_JSL', route: [this.currentLang, 'life-at-jsl'], icon: 'Heart' },
          { key: 'HEADER.INVESTORS', route: [this.currentLang, 'investors'], icon: 'TrendingUp' },
          { key: 'HEADER.VENTURES', route: [this.currentLang, 'ventures'], icon: 'Rocket' },
          { key: 'HEADER.SECURITY', route: [this.currentLang, 'security'], icon: 'ShieldCheck' },
        ]
      },
      {
        id: 'resources',
        titleKey: 'FOOTER.RESOURCES',
        links: [
          { key: 'HEADER.PROJECTS', route: [this.currentLang, 'projects'], icon: 'Lightbulb' },
          { key: 'HEADER.BLOG', route: [this.currentLang, 'blog'], icon: 'Newspaper' },
          { key: 'HEADER.EVENTS', route: [this.currentLang, 'events'], icon: 'CalendarDays' },
          { key: 'HEADER.NEWS', route: [this.currentLang, 'news'], icon: 'Radio' },
          { key: 'HEADER.PRESS', route: [this.currentLang, 'press'], icon: 'BookOpen' },
          { key: 'HEADER.ROADMAP', route: [this.currentLang, 'roadmap'], icon: 'Map' },
          { key: 'HEADER.FAQ', route: [this.currentLang, 'faq'], icon: 'HelpCircle' },
          { key: 'HEADER.DEVELOPERS', route: [this.currentLang, 'developers'], icon: 'Code' },
        ]
      },
      {
        id: 'login',
        titleKey: 'HEADER.LOGIN',
        links: [
          { key: 'HEADER.LOGIN_VIRTEEX', href: 'https://app.virtex.com', icon: 'ExternalLink' },
          { key: 'HEADER.LOGIN_CLIENT', href: 'https://portal.jsl.technology', icon: 'ExternalLink' },
          { key: 'HEADER.LOGIN_SUPPORT', href: 'https://support.jsl.technology', icon: 'ExternalLink' },
        ]
      }
    ];
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

    const handler = new MobileMenuGestures(config, this.ngZone);
    this.gestureHandler = handler;

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('touchstart', handler.handleWindowTouchStart, {
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
    for (const section of this.menuSections) {
      if (this.shouldShowSection(section.titleKey, section.links)) {
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

    // Query all potential focusable elements including those in subcomponents
    const allPotential = Array.from(
      this.el.nativeElement.querySelectorAll(focusableSelectors)
    ) as HTMLElement[];

    const focusableElements = allPotential.filter(el => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const isVisible = style.display !== 'none' &&
                        style.visibility !== 'hidden' &&
                        style.opacity !== '0' &&
                        rect.width > 0 &&
                        rect.height > 0;
      return isVisible;
    });

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
      if (event.cancelable) {
        event.preventDefault();
      }
    }
  }
}
