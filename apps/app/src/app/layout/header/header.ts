import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  ElementRef,
  Inject,
  PLATFORM_ID,
  OnInit,
  OnDestroy,
  Renderer2,
  NgZone,
  AfterViewInit,
  ChangeDetectorRef,
  effect,
  inject,
} from '@angular/core';
import { SearchUiService } from '@core/services/search-ui.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { TopBar } from '../top-bar/top-bar';
import { LanguageSwitcher } from '../language-switcher/language-switcher';
import { SearchOverlayComponent } from '../../shared/components/search-overlay/search-overlay';

@Component({
  selector: 'jsl-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslateModule,
    LucideAngularModule,
    TopBar,
    LanguageSwitcher,
    SearchOverlayComponent
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy, AfterViewInit {
  isMobileMenuOpen = false;
  public currentLang: string;
  public openDropdown: string | null = null;
  public isDesktop = false;
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
  private readonly HORIZONTAL_THRESHOLD = 10; // Mínimo movimiento horizontal para activar
  private readonly VERTICAL_LOCK_THRESHOLD = 10; // Si el movimiento vertical supera esto, bloquear arrastre horizontal

  // Referencias a elementos del DOM
  private menuElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private headerElement: HTMLElement | null = null;

  // Para manejar el estado del menú
  private isAnimating = false;
  private lastDragPosition = 0;
  private isHorizontalGesture = false;
  private lastFocusedElement: HTMLElement | null = null;

  // Estado del acordeón móvil
  public expandedSection: string | null = null;
  public currentYear = new Date().getFullYear();

  private searchUiService = inject(SearchUiService);

  get isSearchOpen() {
    return this.searchUiService.isOpen();
  }

  constructor(
    private translate: TranslateService,
    private el: ElementRef,
    private renderer: Renderer2,
    private ngZone: NgZone,
    private cdRef: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    this.currentLang = this.translate.getCurrentLang() || this.translate.defaultLang || 'es';
    this.isBrowser = isPlatformBrowser(this.platformId);

    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
    });

    effect(() => {
      if (this.isBrowser) {
        if (this.searchUiService.isOpen()) {
          document.body.classList.add('no-scroll');
        } else {
          document.body.classList.remove('no-scroll');
        }
      }
    });
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.updateDesktopStatus();
      this.headerElement = this.el.nativeElement;
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
      this.menuTranslateX = -this.menuWidth;
      this.cdRef.detectChanges();
    }
  }

  private setupGlobalListeners() {
    if (!this.isBrowser || this.isDesktop) return;

    this.ngZone.runOutsideAngular(() => {
      document.addEventListener('touchstart', this.handleWindowTouchStart.bind(this), { passive: false });
    });
  }

  private cleanup() {
    if (!this.isBrowser) return;

    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchstart', this.handleWindowTouchStart.bind(this));
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove.bind(this));
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd.bind(this));
    });
  }

  @HostListener('window:resize')
  onWindowResize() {
    if (this.isBrowser) {
      this.updateDesktopStatus();
      if (!this.isDesktop && this.menuElement) {
        this.menuWidth = this.menuElement.offsetWidth || 320;
        if (!this.isMobileMenuOpen) {
          this.menuTranslateX = -this.menuWidth;
        }
      }
    }
  }

  private updateDesktopStatus() {
    const wasDesktop = this.isDesktop;
    this.isDesktop = window.innerWidth > 992;
    
    if (this.isDesktop && this.isMobileMenuOpen) {
      this.closeMobileMenu();
    } else if (!this.isDesktop && wasDesktop && this.menuElement) {
      setTimeout(() => {
        this.menuWidth = this.menuElement!.offsetWidth || 320;
        this.menuTranslateX = -this.menuWidth;
        this.cdRef.detectChanges();
      }, 100);
    }
  }

  // GESTIÓN DEL DROPDOWN
  toggleDropdown(menu: string, event: MouseEvent) {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === menu ? null : menu;
  }

  closeDropdowns() {
    this.openDropdown = null;
  }

  toggleSearch() {
    this.searchUiService.toggle();
  }

  // TOGGLE MANUAL DEL MENÚ
  toggleMobileMenu() {
    if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
    } else {
      this.openMobileMenu();
    }
    this.closeDropdowns();
  }

  // TOGGLE SECCIONES DEL MENÚ MÓVIL
  toggleSection(section: string) {
    if (this.expandedSection === section) {
      this.expandedSection = null;
    } else {
      this.expandedSection = section;
    }
  }

  // Método público llamado desde el template
  openMobileMenu() {
    if (this.isDesktop || this.isAnimating) return;
    
    this.isAnimating = true;
    this.isMobileMenuOpen = true;
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
    }, 300);
  }

  // Método público llamado desde el template
  closeMobileMenu() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.isMobileMenuOpen = false;
    this.menuTransition = 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)';
    this.menuTranslateX = -this.menuWidth;
    
    if (this.isBrowser) {
      document.body.classList.remove('no-scroll');
      this.triggerHapticFeedback();
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
        this.lastFocusedElement = null;
      }
    }

    this.closeDropdowns();
    
    if (this.overlayElement) {
      this.overlayElement.classList.remove('visible');
    }
    
    this.cdRef.detectChanges();
    
    setTimeout(() => {
      this.isAnimating = false;
    }, 300);
  }

  private triggerHapticFeedback() {
    if (this.isBrowser && navigator.vibrate) {
      navigator.vibrate(5);
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.isBrowser) return;

    // Global Search Shortcut (Cmd/Ctrl + K)
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchUiService.open();
      return;
    }

    if (!this.isMobileMenuOpen) return;

    if (event.key === 'Escape') {
      this.closeMobileMenu();
      return;
    }

    if (event.key === 'Tab') {
      const focusableElements = this.menuElement?.querySelectorAll(
        'a[href], button, textarea, input, select'
      );
      if (focusableElements && focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
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

  // HANDLERS PARA GESTOS EN EL OVERLAY
  onOverlayTouch(event: TouchEvent) {
    if (this.isMobileMenuOpen && !this.isDragging) {
      event.preventDefault();
      event.stopPropagation();
      this.closeMobileMenu();
    }
  }

  // HANDLERS PARA GESTOS EN EL MENÚ (cerrar deslizando hacia la izquierda)
  onMenuTouchStart(event: TouchEvent) {
    if (this.isDesktop || !this.isMobileMenuOpen || this.isAnimating) return;
    
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
    if (this.isDesktop || !this.isMobileMenuOpen) return;
    
    const touch = event.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    
    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    
    // Determinar si el gesto es horizontal
    if (!this.isDragging && !this.isHorizontalGesture) {
      // Si el movimiento vertical es significativo primero, cancelar el arrastre horizontal
      if (absDiffY > this.VERTICAL_LOCK_THRESHOLD && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        return;
      }
      
      // Si el movimiento horizontal es significativo, activar arrastre
      if (absDiffX > this.HORIZONTAL_THRESHOLD && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
        this.isDragging = true;
        event.preventDefault();
        event.stopPropagation();
        
        if (this.menuElement) {
          this.menuElement.classList.add('dragging');
        }
      } else {
        // Aún no hay movimiento significativo en ninguna dirección
        return;
      }
    }
    
    // Solo continuar si es un gesto horizontal
    if (!this.isHorizontalGesture || !this.isDragging) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    let translateX = diffX;
    
    // Aplicar resistencia si intenta arrastrar más allá de los límites
    if (translateX > this.MAX_OVERDRAG) {
      translateX = this.MAX_OVERDRAG + (translateX - this.MAX_OVERDRAG) * 0.3;
    }

    if (translateX < -this.menuWidth - this.MAX_OVERDRAG) {
      const overPull = -this.menuWidth - this.MAX_OVERDRAG - translateX;
      translateX = -this.menuWidth - this.MAX_OVERDRAG + overPull * 0.3;
    }
    
    this.menuTranslateX = translateX;
    this.lastDragPosition = translateX;
    
    // Actualizar opacidad del overlay basado en progreso
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
    
    if (!this.isDragging || !this.isHorizontalGesture || this.isDesktop) return;
    
    this.isDragging = false;
    this.isHorizontalGesture = false;
    
    const diffX = this.currentX - this.startX;
    const elapsedTime = Date.now() - this.startTime;
    const velocity = elapsedTime > 0 ? Math.abs(diffX) / elapsedTime : 0;
    const currentProgress = (this.lastDragPosition + this.menuWidth) / this.menuWidth;
    
    let shouldOpen = false;
    
    // Factor 1: Velocidad del gesto
    if (velocity > this.VELOCITY_THRESHOLD) {
      shouldOpen = diffX > 0;
    } 
    // Factor 2: Progreso actual
    else if (currentProgress > this.OPEN_THRESHOLD) {
      shouldOpen = true;
    }
    // Factor 3: Distancia del gesto
    else if (Math.abs(diffX) > this.MIN_SWIPE_DISTANCE) {
      shouldOpen = diffX > 0;
    }
    // Factor 4: Estado actual
    else {
      shouldOpen = currentProgress > 0.5;
    }
    
    if (shouldOpen) {
      this.openMobileMenu();
    } else {
      this.closeMobileMenu();
    }
    
    // Resetear opacidad del overlay
    if (this.overlayElement) {
      this.overlayElement.style.opacity = '';
    }
  }

  // HANDLERS PARA EDGE SWIPE (abrir desde el borde)
  private handleWindowTouchStart = (event: TouchEvent) => {
    if (this.isDesktop || this.isMobileMenuOpen || this.isDragging || this.isAnimating) return;
    
    const touch = event.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    // Verificar si el toque comienza en la zona de borde izquierdo
    if (startX < this.EDGE_THRESHOLD) {
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
  }

  private handleEdgeSwipeMove = (event: TouchEvent) => {
    if (!this.isDragging || this.isMobileMenuOpen || this.isDesktop) return;
    
    const touch = event.touches[0];
    this.currentX = touch.clientX;
    this.currentY = touch.clientY;
    
    const diffX = this.currentX - this.startX;
    const diffY = this.currentY - this.startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    
    // Determinar si el gesto es horizontal
    if (!this.isHorizontalGesture) {
      // Si el movimiento vertical es significativo primero, cancelar el edge swipe
      if (absDiffY > this.VERTICAL_LOCK_THRESHOLD && absDiffY > absDiffX) {
        this.isHorizontalGesture = false;
        this.cancelEdgeSwipe();
        return;
      }
      
      // Si el movimiento horizontal es significativo, activar edge swipe
      if (absDiffX > this.HORIZONTAL_THRESHOLD && absDiffX > absDiffY) {
        this.isHorizontalGesture = true;
      } else {
        // Aún no hay movimiento significativo en ninguna dirección
        return;
      }
    }
    
    // Solo permitir movimiento hacia la derecha para abrir si es gesto horizontal
    if (this.isHorizontalGesture && diffX > 0) {
      event.preventDefault();
      event.stopPropagation();
      
      let translateX = -this.menuWidth + diffX;
      
      // Aplicar resistencia si supera el límite
      if (translateX > this.MAX_OVERDRAG) {
        translateX = this.MAX_OVERDRAG + (translateX - this.MAX_OVERDRAG) * 0.3;
      }
      
      this.menuTranslateX = translateX;
      this.lastDragPosition = translateX;
      
      const progress = (translateX + this.menuWidth) / this.menuWidth;
      if (this.overlayElement) {
        this.overlayElement.style.opacity = Math.max(0, Math.min(1, progress * 0.7)).toString();
      }
      
      this.cdRef.detectChanges();
    }
  }

  private handleEdgeSwipeEnd = (event: TouchEvent) => {
    if (!this.isDragging || this.isDesktop) return;
    
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });
    
    this.isDragging = false;
    
    // Solo procesar si fue un gesto horizontal
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
    
    // Factor 1: Velocidad
    if (velocity > this.VELOCITY_THRESHOLD) {
      shouldOpen = true;
    }
    // Factor 2: Progreso
    else if (currentProgress > this.OPEN_THRESHOLD) {
      shouldOpen = true;
    }
    // Factor 3: Distancia
    else if (diffX > this.MIN_SWIPE_DISTANCE) {
      shouldOpen = true;
    }
    
    if (shouldOpen) {
      this.openMobileMenu();
    } else {
      this.menuTransition = 'transform 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)';
      this.menuTranslateX = -this.menuWidth;
      
      setTimeout(() => {
        this.cdRef.detectChanges();
      }, 0);
    }
    
    if (this.overlayElement) {
      this.overlayElement.style.opacity = '';
    }
  }

  private cancelEdgeSwipe() {
    this.ngZone.runOutsideAngular(() => {
      document.removeEventListener('touchmove', this.handleEdgeSwipeMove);
      document.removeEventListener('touchend', this.handleEdgeSwipeEnd);
    });
    
    this.isDragging = false;
    this.isHorizontalGesture = false;
    this.menuTranslateX = -this.menuWidth;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.el.nativeElement.contains(event.target)) {
      this.closeDropdowns();
    }
  }

  // Prevenir scroll cuando se está arrastrando horizontalmente
  @HostListener('document:touchmove', ['$event'])
  onDocumentTouchMove(event: TouchEvent) {
    if (this.isDragging && this.isHorizontalGesture && this.isBrowser && !this.isDesktop) {
      event.preventDefault();
    }
  }
}