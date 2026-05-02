import { Component, HostListener, Inject, PLATFORM_ID, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, ChildrenOutletContexts } from '@angular/router';
import { trigger, transition, style, animate, query, group } from '@angular/animations';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { Header } from './layout/header/header';
import { Footer } from './layout/footer/footer';
import { Seo } from './core/services/seo';
import { AnalyticsService } from './core/services/analytics.service';
import { DirectionService } from './core/services/direction.service';
import { ChatBubbleComponent } from './shared/components/chat-bubble/chat-bubble';
import { BreadcrumbsComponent } from './shared/components/breadcrumbs/breadcrumbs';
import { WhatsAppButtonComponent } from './shared/components/whatsapp-button/whatsapp-button';
import { SUPPORTED_LANGUAGES } from '@core/constants/languages';
import { ToastComponent } from './shared/components/toast/toast';
import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner';
import { ScrollRestorationService } from './core/services/scroll-restoration.service';
import Lenis from 'lenis';

@Component({
  selector: 'jsl-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    Header,
    Footer,
    BreadcrumbsComponent,
    // ChatBubbleComponent,
    WhatsAppButtonComponent,
    ToastComponent,
    CookieBannerComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
          style({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            opacity: 0,
          })
        ], { optional: true }),
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(8px)' })
        ], { optional: true }),
        group([
          query(':leave', [
            animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-8px)' }))
          ], { optional: true }),
          query(':enter', [
            animate('250ms 50ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ], { optional: true })
        ])
      ])
    ])
  ]
})
export class App implements OnInit, OnDestroy {
  title = 'jsl-technology-web';
  isScrolled = false;
  private isBrowser: boolean;
  private lenis: Lenis | null = null;
  private rafId: number | null = null;

  // Swipe blocker variables
  private edgeThreshold = 24;
  private minHorizontalMove = 10;
  private startX = 0;
  private startY = 0;
  private maybeEdge = false;
  private touchId: number | null = null;
  private supportsPassive = false;

  constructor(
    private translate: TranslateService,
    private seo: Seo,
    private analytics: AnalyticsService,
    private directionService: DirectionService, // Inject to initialize
    private scrollRestoration: ScrollRestorationService,
    @Inject(PLATFORM_ID) private platformId: object,
    private cookieService: CookieService,
    private contexts: ChildrenOutletContexts,
  ) {
    this.seo.init();
    this.analytics.init();
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.translate.addLangs(SUPPORTED_LANGUAGES);

    if (this.isBrowser) {
      this.initializeLanguage();
      // Ejecutar al cargar la página
      this.updateScrollAndResize();
    }

    this.checkPassiveSupport();
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.initSwipeBlocker();
      this.initLenis();
    }
  }

  ngOnDestroy() {
    if (this.lenis) {
      this.lenis.destroy();
    }
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  private initLenis() {
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    this.scrollRestoration.registerLenis(this.lenis);

    const raf = (time: number) => {
      this.lenis?.raf(time);
      this.rafId = requestAnimationFrame(raf);
    };

    this.rafId = requestAnimationFrame(raf);
  }

  private checkPassiveSupport() {
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: () => { this.supportsPassive = true; return true; }
      });
      (window as any).addEventListener('testPassive', null, opts);
      (window as any).removeEventListener('testPassive', null, opts);
    } catch (e) { }
  }

  private initSwipeBlocker() {
    const addOpts = this.supportsPassive ? { passive: false } : false;

    document.addEventListener('touchstart', this.onTouchStart.bind(this), addOpts as any);
    document.addEventListener('touchmove', this.onTouchMove.bind(this), addOpts as any);
    document.addEventListener('touchend', this.onTouchEnd.bind(this), addOpts as any);
    document.addEventListener('touchcancel', this.onTouchEnd.bind(this), addOpts as any);
  }

  /**
   * Returns true when a touch origin falls within the swipe-sensitive edge zone.
   * LTR: left edge (browser back gesture). RTL: right edge (mirrored back gesture).
   */
  static detectEdge(clientX: number, screenWidth: number, threshold: number, isRtl: boolean): boolean {
    return isRtl
      ? clientX >= screenWidth - threshold   // RTL: swipe in from right edge
      : clientX <= threshold;                // LTR: swipe in from left edge
  }

  /**
   * Returns true when the touch delta describes the gesture that should be blocked.
   * LTR: rightward horizontal swipe. RTL: leftward horizontal swipe.
   * Requires horizontal movement to dominate over vertical.
   */
  static shouldBlockGesture(dx: number, dy: number, minHorizontalMove: number, isRtl: boolean): boolean {
    const horizontalDominates = Math.abs(dx) > Math.abs(dy);
    const towardsCenter = isRtl ? dx < -minHorizontalMove : dx > minHorizontalMove;
    return towardsCenter && horizontalDominates;
  }

  private onTouchStart(e: TouchEvent) {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    this.startX = t.clientX;
    this.startY = t.clientY;
    this.maybeEdge = App.detectEdge(
      this.startX,
      window.innerWidth,
      this.edgeThreshold,
      this.directionService.isRtl()
    );
    this.touchId = t.identifier;
  }

  private onTouchMove(e: TouchEvent) {
    if (!this.maybeEdge) return;

    let t: Touch | null = null;
    if (e.touches && e.touches.length) {
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.touchId) { t = e.touches[i]; break; }
      }
      if (!t) t = e.touches[0];
    } else {
      return;
    }

    const dx = t.clientX - this.startX;
    const dy = t.clientY - this.startY;

    if (App.shouldBlockGesture(dx, dy, this.minHorizontalMove, this.directionService.isRtl())) {
      try {
        if (e.cancelable) {
          e.preventDefault();
          e.stopPropagation();
        }
      } catch (err) {
      }
    }
  }

  private onTouchEnd(e: TouchEvent) {
    this.maybeEdge = false;
    this.touchId = null;
  }

  private initializeLanguage(): void {
    const langCookie = this.cookieService.get('lang');
    if (langCookie && this.translate.getLangs().includes(langCookie)) {
      this.translate.use(langCookie);
      return;
    }

    const browserLang = this.translate.getBrowserLang();
    const supportedLangs = this.translate.getLangs();
    const finalLang =
      browserLang && supportedLangs.includes(browserLang)
        ? browserLang
        : 'en';

    this.cookieService.set('lang', finalLang, { expires: 365, path: '/' });
    this.translate.use(finalLang);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Ejecutar al hacer scroll
    this.updateScrollAndResize();
  }

  @HostListener('window:resize', [])
  onWindowResize() {
    // Ejecutar al redimensionar la ventana
    this.updateScrollAndResize();
  }

  getRouteAnimationData() {
    return this.contexts.getContext('primary')?.route?.snapshot?.data?.['animation'] || this.contexts.getContext('primary')?.route?.snapshot?.url?.join('/') || 'default';
  }

  /**
   * Comprueba el estado del scroll y el tamaño de la ventana
   * para decidir si se aplica la clase 'is-scrolled'.
   */
  private updateScrollAndResize() {
    if (this.isBrowser) {
      const verticalOffset =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      const isDesktop = window.innerWidth > 992; // El breakpoint de tu CSS

      if (isDesktop) {
        // Comportamiento para PC: aplicar clase solo al hacer scroll
        this.isScrolled = verticalOffset > 50;
      } else {
        // Comportamiento para Móvil: nunca aplicar la clase
        this.isScrolled = false;
      }
    }
  }
}