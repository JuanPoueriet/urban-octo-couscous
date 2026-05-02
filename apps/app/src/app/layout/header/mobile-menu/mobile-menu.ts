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

  // Variables para el drawer navigation
  public menuTranslateX = -320;
  public menuTransition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  private startTime = 0;
  private menuWidth = 320;

  // Configuración mejorada de gestos
  private readonly EDGE_THRESHOLD = 20;
  private readonly OPEN_THRESHOLD = 0.3;
  private readonly MIN_SWIPE_DISTANCE = 30;
  private readonly VELOCITY_THRESHOLD = 0.3;
  private readonly MAX_OVERDRAG = 30;
  private readonly HORIZONTAL_THRESHOLD = 10;
  private readonly VERTICAL_LOCK_THRESHOLD = 10;

  private menuElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private isAnimating = false;
  private lastDragPosition = 0;
  private isHorizontalGesture = false;
  private lastFocusedElement: HTMLElement | null = null;

  public currentYear = new Date().getFullYear();
  public searchQuery = '';

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
    if (this.isBrowser) {
      // Logic if needed
    }
  }

  ngAfterViewInit() {
    if (this.isBrowser) {
      this.initializeMenu();
      this.setupGlobalListeners();
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

  private setupGlobalListeners() {
    if (!this.isBrowser) return;

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('touchstart', this.handleWindowTouchStart, {
        passive: false,
      });
    });
  }

  private cleanup() {
    if (!this.isBrowser) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchstart', this.handleWindowTouchStart);
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

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
    }

    this.cdRef.detectChanges();

    setTimeout(() => {
      this.isAnimating = false;
      // Focus the close button for accessibility
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

    // Show if section title matches
    const sectionTitle = this.translate.instant(sectionKey).toLowerCase();
    if (sectionTitle.includes(this.searchQuery.toLowerCase())) {
      return true;
    }

    // Show if any link in the section matches
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
    if (this.searchQuery) {
      this.analyticsService.trackEvent('mobile_menu_search', {
        search_term: this.searchQuery
      });

      // Auto-expand all sections that have matches
      const sections = [
        { id: 'services', title: 'HEADER.SERVICES', links: ['HEADER.VIEW_ALL_SERVICES', 'SERVICES_LIST.WEB', 'SERVICES_LIST.MOBILE', 'SERVICES_LIST.DESKTOP', 'SERVICES_LIST.CLOUD', 'HEADER.INDUSTRIES'] },
        { id: 'products', title: 'HEADER.PRODUCTS', links: ['HEADER.VIEW_ALL_PRODUCTS', 'PRODUCTS_LIST.ERP', 'PRODUCTS_LIST.POS', 'PRODUCTS_LIST.MOBILE', 'HEADER.VIRTEEX_ECOSYSTEM', 'HEADER.PRICING'] },
        { id: 'company', title: 'FOOTER.COMPANY', links: ['HEADER.ABOUT', 'HEADER.PROCESS', 'HEADER.TECH_STACK', 'HEADER.CAREERS', 'HEADER.PARTNERS', 'HEADER.LIFE_AT_JSL', 'HEADER.INVESTORS', 'HEADER.VENTURES', 'HEADER.SECURITY'] },
        { id: 'resources', title: 'FOOTER.RESOURCES', links: ['HEADER.PROJECTS', 'HEADER.BLOG', 'HEADER.EVENTS', 'HEADER.NEWS', 'HEADER.PRESS', 'HEADER.ROADMAP', 'HEADER.FAQ', 'HEADER.DEVELOPERS'] },
        { id: 'login', title: 'HEADER.LOGIN', links: ['HEADER.LOGIN_VIRTEEX', 'HEADER.LOGIN_CLIENT', 'HEADER.LOGIN_SUPPORT'] }
      ];

      for (const section of sections) {
        if (this.shouldShowSection(section.title, section.links)) {
          this.expandedSections.add(section.id);
        }
      }
    }
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
      return;
    }

    if (event.key === 'Tab') {
      const focusableSelectors = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
      const focusableElements = Array.from(this.el.nativeElement.querySelectorAll(focusableSelectors)) as HTMLElement[];

      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === document.body) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    }
  }

  onOverlayTouch(event: TouchEvent) {
    if (this.isMobileMenuOpen && !this.isDragging) {
      event.preventDefault();
      event.stopPropagation();
      this.closeMobileMenu();
    }
  }

  onMenuTouchStart(event: TouchEvent) {
    if (!this.isMobileMenuOpen || this.isAnimating) return;

    event.stopPropagation();
    const touch = event.touches[0];
    this.startX = touch.clientX;
    this.startY = touch.clientY;
    this.currentX = this.startX;
    this.currentY = this.startY;
    this.startTime = Date.now();
    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.menuTransition = 'none';
    this.lastDragPosition = this.menuTranslateX;

    if (this.menuElement) {
      this.menuElement.classList.add('touch-active');
    }
  }

  onMenuTouchMove(event: TouchEvent) {
    if (!this.isMobileMenuOpen) return;

    const touch = event.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;

    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isDragging && !this.isHorizontalGesture) {
      if (absDiffY > this.VERTICAL_LOCK_THRESHOLD && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        return;
      }

      if (absDiffX > this.HORIZONTAL_THRESHOLD && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
        this.isDragging = true;
        event.preventDefault();
        event.stopPropagation();

        if (this.menuElement) {
          this.menuElement.classList.add('dragging');
        }
      } else {
        return;
      }
    }

    if (!this.isHorizontalGesture || !this.isDragging) return;

    event.preventDefault();
    event.stopPropagation();

    let translateX = diffX;
    const isRtl = this.directionService.isRtl();

    if (!isRtl) {
      if (translateX > this.MAX_OVERDRAG) {
        translateX = this.MAX_OVERDRAG + (translateX - this.MAX_OVERDRAG) * 0.3;
      }

      if (translateX < -this.menuWidth - this.MAX_OVERDRAG) {
        const overPull = -this.menuWidth - this.MAX_OVERDRAG - translateX;
        translateX = -this.menuWidth - this.MAX_OVERDRAG + overPull * 0.3;
      }
    } else {
      if (translateX < -this.MAX_OVERDRAG) {
        translateX = -this.MAX_OVERDRAG + (translateX + this.MAX_OVERDRAG) * 0.3;
      }
      if (translateX > this.menuWidth + this.MAX_OVERDRAG) {
        translateX =
          this.menuWidth + this.MAX_OVERDRAG + (translateX - this.menuWidth - this.MAX_OVERDRAG) * 0.3;
      }
    }

    this.menuTranslateX = translateX;
    this.lastDragPosition = translateX;

    const progress = (translateX + this.menuWidth) / this.menuWidth;
    if (this.overlayElement) {
      this.overlayElement.style.opacity = Math.max(0, Math.min(1, progress * 0.7)).toString();
    }

    this.cdRef.detectChanges();
  }

  onMenuTouchEnd(event: TouchEvent) {
    if (this.menuElement) {
      this.menuElement.classList.remove('touch-active', 'dragging');
    }

    if (!this.isDragging || !this.isHorizontalGesture) return;

    this.isDragging = false;
    this.isHorizontalGesture = false;

    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? Math.abs(diffX) / elapsedTime : 0;
    const currentProgress = (this.lastDragPosition + this.menuWidth) / this.menuWidth;

    let shouldOpen = false;
    const isRtl = this.directionService.isRtl();

    if (velocity > this.VELOCITY_THRESHOLD) {
      shouldOpen = isRtl ? diffX < 0 : diffX > 0;
    } else if (currentProgress > this.OPEN_THRESHOLD) {
      shouldOpen = true;
    } else if (Math.abs(diffX) > this.MIN_SWIPE_DISTANCE) {
      shouldOpen = isRtl ? diffX < 0 : diffX > 0;
    } else {
      shouldOpen = currentProgress > 0.5;
    }

    if (shouldOpen) {
      this.openDrawer();
    } else {
      this.closeMobileMenu();
    }

    if (this.overlayElement) {
      this.overlayElement.style.opacity = '';
    }
  }

  private handleWindowTouchStart = (event: TouchEvent) => {
    if (this.isMobileMenuOpen || this.isDragging || this.isAnimating) return;

    const touch = event.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;

    const isRtl = this.directionService.isRtl();
    const isEdge = isRtl
      ? startX > window.innerWidth - this.EDGE_THRESHOLD
      : startX < this.EDGE_THRESHOLD;

    if (isEdge) {
      event.preventDefault();
      event.stopPropagation();

      this.startX = startX;
      this.startY = startY;
      this.currentX = startX;
      this.currentY = startY;
      this.startTime = Date.now();
      this.isDragging = true;
      this.isHorizontalGesture = false;
      this.menuTransition = 'none';

      if (!this.menuElement) {
        this.initializeMenu();
      }

      this.ngZone.runOutsideAngular(() => {
        document.addEventListener('touchmove', this.handleEdgeSwipeMove, { passive: false });
        document.addEventListener('touchend', this.handleEdgeSwipeEnd);
      });
    }
  };

  private handleEdgeSwipeMove = (event: TouchEvent) => {
    if (!this.isDragging || this.isMobileMenuOpen) return;

    const touch = event.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;

    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (!this.isHorizontalGesture) {
      if (absDiffY > this.VERTICAL_LOCK_THRESHOLD && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        this.cancelEdgeSwipe();
        return;
      }

      if (absDiffX > this.HORIZONTAL_THRESHOLD && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
      } else {
        return;
      }
    }

    const isRtl = this.directionService.isRtl();
    const isValidDirection = isRtl ? diffX < 0 : diffX > 0;

    if (this.isHorizontalGesture && isValidDirection) {
      event.preventDefault();
      event.stopPropagation();

      let translateX = isRtl ? this.menuWidth + diffX : -this.menuWidth + diffX;

      if (!isRtl && translateX > this.MAX_OVERDRAG) {
        translateX = this.MAX_OVERDRAG + (translateX - this.MAX_OVERDRAG) * 0.3;
      } else if (isRtl && translateX < -this.MAX_OVERDRAG) {
        translateX = -this.MAX_OVERDRAG + (translateX + this.MAX_OVERDRAG) * 0.3;
      }

      this.menuTranslateX = translateX;
      this.lastDragPosition = translateX;

      const progress = (translateX + this.menuWidth) / this.menuWidth;
      if (this.overlayElement) {
        this.overlayElement.style.opacity = Math.max(0, Math.min(1, progress * 0.7)).toString();
      }

      this.cdRef.detectChanges();
    }
  };

  private handleEdgeSwipeEnd = (event: TouchEvent) => {
    if (!this.isDragging) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

    this.isDragging = false;

    if (!this.isHorizontalGesture) {
      this.isHorizontalGesture = false;
      this.menuTranslateX = -this.menuWidth;
      return;
    }

    this.isHorizontalGesture = false;
    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? diffX / elapsedTime : 0;
    const currentProgress = (this.lastDragPosition + this.menuWidth) / this.menuWidth;

    let shouldOpen = false;

    if (velocity > this.VELOCITY_THRESHOLD) {
      shouldOpen = true;
    } else if (currentProgress > this.OPEN_THRESHOLD) {
      shouldOpen = true;
    } else if (diffX > this.MIN_SWIPE_DISTANCE) {
      shouldOpen = true;
    }

    if (shouldOpen) {
      this.menuService.open();
    } else {
      this.menuTransition = 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)';
      const isRtl = this.directionService.isRtl();
      this.menuTranslateX = isRtl ? this.menuWidth : -this.menuWidth;

      setTimeout(() => {
        this.cdRef.detectChanges();
      }, 0);
    }

    if (this.overlayElement) {
      this.overlayElement.style.opacity = '';
    }
  };

  private cancelEdgeSwipe() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });

    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.menuTranslateX = this.directionService.isRtl() ? this.menuWidth : -this.menuWidth;
  }

  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent) {
    if (this.isDragging && this.isHorizontalGesture && this.isBrowser) {
      event.preventDefault();
    }
  }
}
