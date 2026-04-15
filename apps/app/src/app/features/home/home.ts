import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  Renderer2,
  signal,
  OnDestroy,
} from '@angular/core';
import { SearchUiService } from '@core/services/search-ui.service';
import { DirectionService } from '@core/services/direction.service';
import { CommonModule, isPlatformBrowser, NgOptimizedImage, DOCUMENT } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { Card } from '@shared/components/card/card';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { DataService, Technology } from '@core/services/data.service';
import { Seo } from '@core/services/seo';
import { ToastService } from '@core/services/toast.service';
import { SwiperOptions } from 'swiper/types';
import { toSignal } from '@angular/core/rxjs-interop';
import { DigitalMaturitySelector } from './components/digital-maturity-selector/digital-maturity-selector';
import { VideoModal } from '@shared/components/video-modal/video-modal';
import { BookingModal } from '@shared/components/booking-modal/booking-modal';
import { ExitIntentModal } from './components/exit-intent-modal/exit-intent-modal';
import { ImageComparisonComponent } from '@shared/components/image-comparison/image-comparison';
import { SkeletonLoaderComponent } from '@shared/components/skeleton-loader/skeleton-loader.component';
import { RoiCalculatorComponent } from '@shared/components/roi-calculator/roi-calculator.component';
import { computed } from '@angular/core';

// Swiper Web Components
import { Pagination, Autoplay, EffectCoverflow, EffectFade, Navigation } from 'swiper/modules';
import { register } from 'swiper/element/bundle';

register();

@Component({
  selector: 'jsl-home',
  standalone: true,
  imports: [
    CommonModule,
    NgOptimizedImage,
    TranslateModule,
    LucideAngularModule,
    RouterLink,
    Card,
    AnimateOnScroll,
    DigitalMaturitySelector,
    VideoModal,
    BookingModal,
    ExitIntentModal,
    ImageComparisonComponent,
    SkeletonLoaderComponent,
    RoiCalculatorComponent
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Home implements OnInit, AfterViewInit, OnDestroy {
  public heroSwiperConfig: SwiperOptions = {
    modules: [EffectFade, Autoplay, Pagination, Navigation],
    effect: 'fade',
    fadeEffect: {
      crossFade: true,
    },
    pagination: {
      clickable: true,
      dynamicBullets: true,
    },
    autoplay: {
      delay: 5000,
      disableOnInteraction: false,
    },
    loop: true,
    speed: 800,
    grabCursor: false,
    allowTouchMove: false,
    simulateTouch: false,
    // ← CRÍTICO: Configuración de navegación CORRECTA
    navigation: {
      nextEl: '.hero-swiper-button-next',
      prevEl: '.hero-swiper-button-prev',
    },
  };

  public logoSwiperConfig: SwiperOptions = {
    modules: [Autoplay],
    slidesPerView: 2,
    spaceBetween: 30,
    loop: true,
    speed: 3000, // Velocidad constante para efecto marquee
    autoplay: {
      delay: 0,
      disableOnInteraction: false,
      pauseOnMouseEnter: false,
    },
    allowTouchMove: false, // Deshabilitar interacción manual para marquee puro
    breakpoints: {
      640: {
        slidesPerView: 3,
        spaceBetween: 40,
      },
      768: {
        slidesPerView: 4,
        spaceBetween: 50,
      },
      1024: {
        slidesPerView: 5,
        spaceBetween: 60,
      },
      1280: {
        slidesPerView: 6,
        spaceBetween: 70,
      },
    },
  };

  public testimonialSwiperConfig: SwiperOptions = {
    modules: [Pagination, Autoplay, EffectCoverflow],
    effect: 'coverflow',
    coverflowEffect: {
      rotate: 50,
      stretch: 0,
      depth: 100,
      modifier: 1,
      slideShadows: true,
    },
    spaceBetween: 30,
    grabCursor: true,
    centeredSlides: true,
    slidesPerView: 'auto',
    loop: true,
    autoplay: {
      delay: 7000,
      disableOnInteraction: false,
    },
    pagination: {
      clickable: true,
    },
  };

  public currentLang: string;

  private translate = inject(TranslateService);
  private dataService = inject(DataService);
  private toastService = inject(ToastService);

  public stats = [
    { valueKey: 'HOME.STATS_PROJECTS', icon: 'CheckCircle' },
    { valueKey: 'HOME.STATS_UPTIME', icon: 'Server' },
    { valueKey: 'HOME.STATS_COSTS', icon: 'TrendingDown' },
    { valueKey: 'HOME.STATS_SUPPORT', icon: 'Headphones' },
  ];

  public teamMembers = [
    { nameKey: 'ABOUT.TEAM_MEMBER_1_NAME', roleKey: 'ABOUT.TEAM_MEMBER_1_ROLE', image: 'assets/imgs/Avif/img-1.avif' },
    { nameKey: 'ABOUT.TEAM_MEMBER_2_NAME', roleKey: 'ABOUT.TEAM_MEMBER_2_ROLE', image: 'assets/imgs/Avif/img-2.avif' },
    { nameKey: 'ABOUT.TEAM_MEMBER_3_NAME', roleKey: 'ABOUT.TEAM_MEMBER_3_ROLE', image: 'assets/imgs/Avif/photo-1517694712202-14dd9538aa97.avif' },
  ];

  public faqPreview = [
    { titleKey: 'FAQ.Q1_TITLE', descKey: 'FAQ.Q1_DESC', isOpen: false },
    { titleKey: 'FAQ.Q2_TITLE', descKey: 'FAQ.Q2_DESC', isOpen: false },
    { titleKey: 'FAQ.Q3_TITLE', descKey: 'FAQ.Q3_DESC', isOpen: false },
  ];

  public testimonials = toSignal(this.dataService.getTestimonials(), { initialValue: [] });
  public projects = toSignal(this.dataService.getProjects(), { initialValue: [] });

  // New filtering logic for projects
  public selectedProjectCategory = signal<string>('All');
  public projectCategories = ['All', 'Enterprise', 'Commerce', 'Mobile']; // Could be dynamic

  public filteredProjects = computed(() => {
    const allProjects = this.projects();
    const category = this.selectedProjectCategory();

    if (category === 'All') {
      return allProjects;
    }
    return allProjects.filter((p: any) => p.category === category);
  });

  public solutions = toSignal(this.dataService.getSolutions(), { initialValue: [] });
  public products = toSignal(this.dataService.getProducts(), { initialValue: [] });
  public processSteps = toSignal(this.dataService.getProcessSteps(), { initialValue: [] });
  public partners = toSignal(this.dataService.getPartners(), { initialValue: [] });

  // Modal signals
  public isVideoModalOpen = signal(false);
  public isBookingModalOpen = signal(false);
  public isExitModalOpen = signal(false);

  // Default video
  public demoVideoUrl = 'https://www.youtube.com/embed/LXb3EKWsInQ'; // Tech demo placeholder

  public techStack = toSignal(
    this.dataService.getTechStack().pipe(
      map((categories) => {
        const allTechs: Technology[] = [];
        const seen = new Set<string>();
        categories.forEach((cat) => {
          cat.technologies.forEach((tech) => {
            if (!seen.has(tech.name)) {
              allTechs.push(tech);
              seen.add(tech.name);
            }
          });
        });
        return allTechs;
      })
    ),
    { initialValue: [] }
  );

  public latestBlogPosts = toSignal(
    this.dataService.getBlogPosts().pipe(map((posts) => posts.slice(0, 3))),
    { initialValue: [] }
  );

  public activeTab = signal<'services' | 'products'>('services');
  public isReturningVisitor = signal(false);
  public isSubmitting = signal(false);
  public isLoading = signal(true); // For skeleton loader demo

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private searchUiService = inject(SearchUiService);
  private seoService = inject(Seo);
  public directionService = inject(DirectionService);
  private unlistenExitIntent: (() => void) | null = null;
  private unlistenHeroMouseMove: (() => void) | null = null;
  private unlistenHeroMouseLeave: (() => void) | null = null;
  private socialProofInterval: any;
  private isBrowser: boolean;

  @Inject(PLATFORM_ID) private platformId = inject(PLATFORM_ID);

  constructor() {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
      // Re-generate schema on lang change if needed, but for now simple init
    });

    if (isPlatformBrowser(this.platformId)) {
      const visited = localStorage.getItem('jsl_visited');
      if (visited) {
        this.isReturningVisitor.set(true);
      } else {
        localStorage.setItem('jsl_visited', 'true');
      }

      // Simulate initial loading
      setTimeout(() => {
        this.isLoading.set(false);
      }, 1500);
    }

    this.addSchemaData();
  }

  ngOnDestroy() {
    if (this.unlistenExitIntent) {
      this.unlistenExitIntent();
    }
    if (this.unlistenHeroMouseMove) {
      this.unlistenHeroMouseMove();
    }
    if (this.unlistenHeroMouseLeave) {
      this.unlistenHeroMouseLeave();
    }
    if (this.socialProofInterval) {
      clearInterval(this.socialProofInterval);
    }
  }

  setActiveTab(tab: 'services' | 'products') {
    this.activeTab.set(tab);
  }

  private addSchemaData() {
    const baseUrl = this.seoService.getBaseUrl();
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          'name': 'JSL Technology',
          'url': baseUrl,
          'logo': `${baseUrl}/logo.png`,
          'sameAs': [
            'https://www.linkedin.com/company/jsl-technology',
            'https://twitter.com/jsl_tech'
          ],
          'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+1-809-555-5555',
            'contactType': 'customer service',
            'areaServed': 'Global',
            'availableLanguage': ['Spanish', 'English']
          }
        },
        {
          '@type': 'Service',
          'serviceType': 'Software Development',
          'provider': {
            '@type': 'Organization',
            'name': 'JSL Technology'
          },
          'areaServed': {
            '@type': 'Place',
            'name': 'Global'
          },
          'hasOfferCatalog': {
            '@type': 'OfferCatalog',
            'name': 'Software Solutions',
            'itemListElement': [
              {
                '@type': 'Offer',
                'itemOffered': {
                  '@type': 'Service',
                  'name': 'Web Development'
                }
              },
              {
                '@type': 'Offer',
                'itemOffered': {
                  '@type': 'Service',
                  'name': 'Mobile App Development'
                }
              },
              {
                '@type': 'Offer',
                'itemOffered': {
                  '@type': 'Service',
                  'name': 'ERP Implementation'
                }
              }
            ]
          }
        },
        {
          '@type': 'BreadcrumbList',
          'itemListElement': [{
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': `${baseUrl}/${this.currentLang}/`
          }]
        },
        {
          '@type': 'FAQPage',
          'mainEntity': this.faqPreview.map(faq => ({
            '@type': 'Question',
            'name': this.translate.instant(faq.titleKey),
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': this.translate.instant(faq.descKey)
            }
          }))
        }
      ]
    };

    this.seoService.setJsonLd(schema);
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      // 1. Hero Slider
      const heroSwiperEl = this.el.nativeElement.querySelector('.hero-slider swiper-container');
      
      if (heroSwiperEl) {
        // ← CRÍTICO: Configuración SIMPLIFICADA y DIRECTA
        Object.assign(heroSwiperEl, {
          modules: [EffectFade, Autoplay, Pagination, Navigation],
          effect: 'fade',
          fadeEffect: { crossFade: true },
          pagination: { 
            clickable: true,
            dynamicBullets: true 
          },
          autoplay: {
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          },
          loop: true,
          speed: 800,
          grabCursor: false,
          allowTouchMove: false,
          simulateTouch: false,
          // ← CRÍTICO: Navegación correctamente configurada
          navigation: {
            nextEl: '.hero-swiper-button-next',
            prevEl: '.hero-swiper-button-prev',
            disabledClass: 'swiper-button-disabled',
          },
        });

        // Inicializar
        heroSwiperEl.initialize();
        this.setupHeroNavigationVisibility();

        // Iniciar autoplay
        setTimeout(() => {
          if (heroSwiperEl.swiper && heroSwiperEl.swiper.autoplay) {
            heroSwiperEl.swiper.autoplay.start();
          }
        }, 200);
      }

      // 2. Logo Slider (Tech Stack)
      const logoSwiperEl = this.el.nativeElement.querySelector('.tech-stack-slider swiper-container');

      if (logoSwiperEl) {
        Object.assign(logoSwiperEl, {
          modules: [Autoplay],
          slidesPerView: 2,
          spaceBetween: 30,
          loop: true,
          speed: 3000,
          autoplay: {
            delay: 0,
            disableOnInteraction: false,
            pauseOnMouseEnter: false,
          },
          allowTouchMove: false,
          breakpoints: {
            640: { slidesPerView: 3, spaceBetween: 40 },
            768: { slidesPerView: 4, spaceBetween: 50 },
            1024: { slidesPerView: 5, spaceBetween: 60 },
            1280: { slidesPerView: 6, spaceBetween: 70 },
          },
        });

        logoSwiperEl.initialize();

        setTimeout(() => {
          if (logoSwiperEl.swiper && logoSwiperEl.swiper.autoplay) {
            logoSwiperEl.swiper.autoplay.start();
          }
        }, 100);
      }

      // 3. Testimonial Slider
      const testimonialSwiperEl = this.el.nativeElement.querySelector(
        '.testimonial-slider swiper-container'
      );

      if (testimonialSwiperEl) {
        Object.assign(testimonialSwiperEl, {
          modules: [Pagination, Autoplay, EffectCoverflow],
          effect: 'coverflow',
          coverflowEffect: {
            rotate: 50,
            stretch: 0,
            depth: 100,
            modifier: 1,
            slideShadows: true,
          },
          spaceBetween: 30,
          grabCursor: true,
          centeredSlides: true,
          slidesPerView: 'auto',
          loop: true,
          autoplay: {
            delay: 7000,
            disableOnInteraction: false,
          },
          pagination: {
            clickable: true,
          },
        });

        testimonialSwiperEl.initialize();

        setTimeout(() => {
          if (testimonialSwiperEl.swiper && testimonialSwiperEl.swiper.autoplay) {
            testimonialSwiperEl.swiper.autoplay.start();
          }
        }, 500);
      }

      // Setup Exit Intent
      this.setupExitIntent();

      // Start Social Proof Toasts
      this.startSocialProofSimulation();
    }, 100); // Aumentado a 100ms para asegurar que el DOM esté listo
  }

  private startSocialProofSimulation() {
    if (!this.isBrowser) return;

    // Initial delay then periodic
    setTimeout(() => {
      this.showRandomSocialProof();
      this.socialProofInterval = setInterval(() => {
        this.showRandomSocialProof();
      }, 45000); // Every 45 seconds
    }, 10000); // Start 10s after load
  }

  private showRandomSocialProof() {
    const proofs = [
      { key: 'HOME.PROOF_1', type: 'info' }, // Someone from Madrid downloaded Whitepaper
      { key: 'HOME.PROOF_2', type: 'success' }, // New Enterprise client onboarded
      { key: 'HOME.PROOF_3', type: 'info' }, // 500+ developers joined the community
    ];
    const random = proofs[Math.floor(Math.random() * proofs.length)];
    // this.toastService.show(random.key, random.type, 4000);
    // Note: Since I don't have the keys in translation files yet, I will use hardcoded mock strings for now if keys are missing
    // But better to stick to keys. I will add keys to en.json later or use a fallback.

    // Using translated messages or fallbacks
    const messages = [
      this.translate.instant('HOME.PROOF_1') === 'HOME.PROOF_1' ? 'Someone from Madrid just downloaded the 2025 Whitepaper' : this.translate.instant('HOME.PROOF_1'),
      this.translate.instant('HOME.PROOF_2') === 'HOME.PROOF_2' ? 'New Enterprise client from FinTech sector just onboarded' : this.translate.instant('HOME.PROOF_2'),
      this.translate.instant('HOME.PROOF_3') === 'HOME.PROOF_3' ? 'JSL just deployed a new High-Performance Banking App' : this.translate.instant('HOME.PROOF_3'),
      'Visitor from London requested a consultation'
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    this.toastService.show(msg, 'info', 5000);
  }

  private setupExitIntent() {
    // Only on desktop
    if (window.innerWidth > 1024) {
      // Use a flag to show only once per session
      const hasShownExitModal = sessionStorage.getItem('jsl_exit_modal_shown');

      if (!hasShownExitModal) {
        this.unlistenExitIntent = this.renderer.listen(this.document, 'mouseleave', (event: MouseEvent) => {
          if (event.clientY <= 0) {
            this.openExitModal();
          }
        });
      }
    }
  }

  private setupHeroNavigationVisibility(): void {
    const heroSlider = this.el.nativeElement.querySelector('.hero-slider') as HTMLElement | null;
    if (!heroSlider) return;

    const updateVisibility = (event: MouseEvent) => {
      const rect = heroSlider.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const edgeZone = Math.max(240, rect.width * 0.3);

      const leftRatio = Math.max(0, (edgeZone - x) / edgeZone);
      const rightRatio = Math.max(0, (x - (rect.width - edgeZone)) / edgeZone);

      heroSlider.style.setProperty('--hero-nav-left-visibility', leftRatio.toFixed(3));
      heroSlider.style.setProperty('--hero-nav-right-visibility', rightRatio.toFixed(3));
    };

    this.unlistenHeroMouseMove = this.renderer.listen(heroSlider, 'mousemove', updateVisibility);
    this.unlistenHeroMouseLeave = this.renderer.listen(heroSlider, 'mouseleave', () => {
      heroSlider.style.setProperty('--hero-nav-left-visibility', '0');
      heroSlider.style.setProperty('--hero-nav-right-visibility', '0');
    });

    // Estado inicial sutil
    heroSlider.style.setProperty('--hero-nav-left-visibility', '0');
    heroSlider.style.setProperty('--hero-nav-right-visibility', '0');
  }

  getStars(count: number): any[] {
    return new Array(count);
  }

  toggleFaq(index: number) {
    this.faqPreview[index].isOpen = !this.faqPreview[index].isOpen;
  }

  openVideoModal() {
    this.isVideoModalOpen.set(true);
  }

  closeVideoModal() {
    this.isVideoModalOpen.set(false);
  }

  openBookingModal() {
    this.isBookingModalOpen.set(true);
  }

  closeBookingModal() {
    this.isBookingModalOpen.set(false);
  }

  openExitModal() {
    if (!sessionStorage.getItem('jsl_exit_modal_shown')) {
      this.isExitModalOpen.set(true);
      sessionStorage.setItem('jsl_exit_modal_shown', 'true');
    }
  }

  closeExitModal() {
    this.isExitModalOpen.set(false);
  }

  onExitModalConfirm() {
    this.closeExitModal();
    this.downloadLeadMagnet();
  }

  setProjectCategory(category: string) {
    this.selectedProjectCategory.set(category);
  }

  openSearch() {
    this.searchUiService.open();
  }

  onPrevNav() {
    if (!this.isBrowser) return;
    const heroSwiperEl = this.el.nativeElement.querySelector('.hero-slider swiper-container');
    heroSwiperEl?.swiper?.slidePrev();
  }

  onNextNav() {
    if (!this.isBrowser) return;
    const heroSwiperEl = this.el.nativeElement.querySelector('.hero-slider swiper-container');
    heroSwiperEl?.swiper?.slideNext();
  }

  downloadLeadMagnet() {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    // Simular descarga con delay
    setTimeout(() => {
      this.toastService.show(
        'HOME.LEAD_MAGNET_SENT',
        'success',
        5000
      );
      this.isSubmitting.set(false);
    }, 2000);
  }
}
