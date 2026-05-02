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
  Signal,
} from '@angular/core';
import { SearchUiService } from '@core/services/search-ui.service';
import { DirectionService } from '@core/services/direction.service';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { Card } from '@shared/components/card/card';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { DataService, Technology, Testimonial, Project, Solution, Product, ProcessStep, Partner, BlogPost } from '@core/services/data.service';
import { Seo } from '@core/services/seo';
import { AnalyticsService } from '@core/services/analytics.service';
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
import { PictureComponent } from '@shared/components/picture/picture';
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
    RoiCalculatorComponent,
    PictureComponent
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

  public offeringsSwiperConfig: SwiperOptions = {
    modules: [Navigation, Pagination],
    slidesPerView: 1.1,
    spaceBetween: 16,
    grabCursor: true,
    loop: false,
    speed: 600,
    navigation: {
      nextEl: '.offerings-swiper-button-next',
      prevEl: '.offerings-swiper-button-prev',
    },
    breakpoints: {
      640: {
        slidesPerView: 1.5,
        spaceBetween: 20,
      },
      768: {
        slidesPerView: 2.2,
        spaceBetween: 25,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 30,
      },
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

  public insightsSwiperConfig: SwiperOptions = {
    modules: [Navigation, Pagination],
    slidesPerView: 1.2,
    spaceBetween: 20,
    grabCursor: true,
    loop: false,
    speed: 600,
    navigation: {
      nextEl: '.insights-swiper-button-next',
      prevEl: '.insights-swiper-button-prev',
    },
    breakpoints: {
      768: {
        slidesPerView: 2.2,
        spaceBetween: 25,
      },
      1024: {
        slidesPerView: 3,
        spaceBetween: 30,
      },
    },
  };

  public currentLang: string;

  private translate = inject(TranslateService);
  private dataService = inject(DataService);
  private toastService = inject(ToastService);

  public stats = [
    { valueKey: 'HOME.STATS_PROJECTS', labelKey: 'HOME.STATS_PROJECTS_LABEL', icon: 'Award', subtitleKey: 'HOME.STATS_PROJECTS_SUB' },
    { valueKey: 'HOME.STATS_UPTIME', labelKey: 'HOME.STATS_UPTIME_LABEL', icon: 'ShieldCheck', subtitleKey: 'HOME.STATS_UPTIME_SUB' },
    { valueKey: 'HOME.STATS_COSTS', labelKey: 'HOME.STATS_COSTS_LABEL', icon: 'TrendingDown', subtitleKey: 'HOME.STATS_COSTS_SUB' },
    { valueKey: 'HOME.STATS_SUPPORT', labelKey: 'HOME.STATS_SUPPORT_LABEL', icon: 'ThumbsUp', subtitleKey: 'HOME.STATS_SUPPORT_SUB' },
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

  public testimonials: Signal<Testimonial[]> = toSignal(this.dataService.getTestimonials(), { initialValue: [] as Testimonial[] });
  public projects: Signal<Project[]> = toSignal(this.dataService.getProjects(), { initialValue: [] as Project[] });

  // New filtering logic for projects
  public selectedProjectCategory = signal<string>('All');
  public projectCategories = ['All', 'Enterprise', 'Commerce', 'Mobile']; // Could be dynamic

  public filteredProjects = computed<Project[]>(() => {
    const allProjects = this.projects();
    const category = this.selectedProjectCategory();

    if (category === 'All') {
      return allProjects;
    }
    return allProjects.filter((project) => project.category === category);
  });

  public solutions: Signal<Solution[]> = toSignal(this.dataService.getSolutions(), { initialValue: [] as Solution[] });
  public products: Signal<Product[]> = toSignal(this.dataService.getProducts(), { initialValue: [] as Product[] });
  public processSteps: Signal<ProcessStep[]> = toSignal(this.dataService.getProcessSteps(), { initialValue: [] as ProcessStep[] });
  public partners: Signal<Partner[]> = toSignal(this.dataService.getPartners(), { initialValue: [] as Partner[] });

  // Modal signals
  public isVideoModalOpen = signal(false);
  public isBookingModalOpen = signal(false);
  public isExitModalOpen = signal(false);

  // Default video
  public demoVideoUrl = 'https://www.youtube.com/embed/LXb3EKWsInQ'; // Tech demo placeholder

  public techStack: Signal<Technology[]> = toSignal(
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
    { initialValue: [] as Technology[] }
  );

  public latestBlogPosts: Signal<BlogPost[]> = toSignal(
    this.dataService.getBlogPosts().pipe(map((posts) => posts.slice(0, 3))),
    { initialValue: [] as BlogPost[] }
  );

  public activeTab = signal<'services' | 'products'>('services');

  public offeringItems = computed(() => {
    return this.activeTab() === 'services' ? this.solutions() : this.products();
  });
  public isReturningVisitor = signal(false);
  public isSubmitting = signal(false);
  public isLoading = signal(true); // For skeleton loader demo
  public showScrollIndicator = signal(true);

  private el = inject(ElementRef);
  private renderer = inject(Renderer2);
  private document = inject(DOCUMENT);
  private searchUiService = inject(SearchUiService);
  private seoService = inject(Seo);
  private analyticsService = inject(AnalyticsService);
  public directionService: DirectionService = inject(DirectionService);
  private unlistenExitIntent: (() => void) | null = null;
  private unlistenHeroMouseMove: (() => void) | null = null;
  private unlistenHeroMouseLeave: (() => void) | null = null;
  private unlistenInsightsMouseMove: (() => void) | null = null;
  private unlistenInsightsMouseLeave: (() => void) | null = null;
  private unlistenOfferingsMouseMove: (() => void) | null = null;
  private unlistenOfferingsMouseLeave: (() => void) | null = null;
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
      const scrollIndicatorSeen = localStorage.getItem('jsl_scroll_indicator_seen');
      if (scrollIndicatorSeen) {
        this.showScrollIndicator.set(false);
      }

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
    if (this.unlistenInsightsMouseMove) {
      this.unlistenInsightsMouseMove();
    }
    if (this.unlistenInsightsMouseLeave) {
      this.unlistenInsightsMouseLeave();
    }
    if (this.unlistenOfferingsMouseMove) {
      this.unlistenOfferingsMouseMove();
    }
    if (this.unlistenOfferingsMouseLeave) {
      this.unlistenOfferingsMouseLeave();
    }
    if (this.socialProofInterval) {
      clearInterval(this.socialProofInterval);
    }
  }

  setActiveTab(tab: 'services' | 'products') {
    this.activeTab.set(tab);
    if (this.isBrowser) {
      setTimeout(() => {
        const offeringsSwiperEl = this.el.nativeElement.querySelector('.offerings-section swiper-container');
        if (offeringsSwiperEl && offeringsSwiperEl.swiper) {
          offeringsSwiperEl.swiper.slideTo(0);
        }
      }, 50);
    }
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
            'telephone': '+1-809-264-1693',
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

    // WebSite schema with SearchAction (Sitelinks Searchbox)
    this.seoService.setWebSiteSchema();

    // VideoObject schema for the demo reel
    this.seoService.setVideoSchema({
      name: 'JSL Technology — Product Demo Reel',
      description: 'Watch how JSL Technology builds custom ERP, POS, and mobile solutions that transform businesses worldwide.',
      thumbnailUrl: `${baseUrl}/assets/imgs/jsl-social-default.jpg`,
      uploadDate: '2025-10-01',
      duration: 'PT3M',
      embedUrl: this.demoVideoUrl,
    });

    // AggregateRating + Review schema from testimonial data
    const testimonialData = this.testimonials();
    if (testimonialData && testimonialData.length > 0) {
      const resolvedReviews = testimonialData.map((t: any) => ({
        authorName: this.translate.instant(t.nameKey),
        reviewBody: this.translate.instant(t.textKey),
        ratingValue: t.ratingValue ?? 5,
        datePublished: t.datePublished ?? '2025-10-01',
      }));
      this.seoService.setReviewSchema(resolvedReviews);
    }
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

      // 4. Latest Insights Slider
      const insightsSwiperEl = this.el.nativeElement.querySelector('.latest-insights swiper-container');

      if (insightsSwiperEl) {
        Object.assign(insightsSwiperEl, this.insightsSwiperConfig);

        insightsSwiperEl.initialize();
        this.setupInsightsNavigationVisibility();
      }

      // 5. Offerings Slider
      const offeringsSwiperEl = this.el.nativeElement.querySelector('.offerings-section swiper-container');

      if (offeringsSwiperEl) {
        Object.assign(offeringsSwiperEl, this.offeringsSwiperConfig);

        offeringsSwiperEl.initialize();
        this.setupOfferingsNavigationVisibility();
      }

      // Setup Exit Intent
      this.setupExitIntent();

      // Start Social Proof Toasts
      this.startSocialProofSimulation();

      // Desaparecer indicador de scroll después de 5 segundos
      setTimeout(() => {
        if (this.showScrollIndicator()) {
          this.showScrollIndicator.set(false);
          localStorage.setItem('jsl_scroll_indicator_seen', 'true');
        }
      }, 5000);
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
      const pointerPercent = (x / rect.width) * 100;

      // UX: la visibilidad empieza a crecer ya desde el 40% hacia el borde izquierdo
      // y desde el 60% hacia el borde derecho (centro visual en 50%).
      const leftRatio = Math.max(0, Math.min(1, (40 - pointerPercent) / 40));
      const rightRatio = Math.max(0, Math.min(1, (pointerPercent - 60) / 40));

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

  private setupInsightsNavigationVisibility(): void {
    const insightsSection = this.el.nativeElement.querySelector('.latest-insights') as HTMLElement | null;
    if (!insightsSection) return;

    const updateVisibility = (event: MouseEvent) => {
      const rect = insightsSection.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const pointerPercent = (x / rect.width) * 100;

      const leftRatio = Math.max(0, Math.min(1, (30 - pointerPercent) / 30));
      const rightRatio = Math.max(0, Math.min(1, (pointerPercent - 70) / 30));

      insightsSection.style.setProperty('--insights-nav-left-visibility', leftRatio.toFixed(3));
      insightsSection.style.setProperty('--insights-nav-right-visibility', rightRatio.toFixed(3));
    };

    this.unlistenInsightsMouseMove = this.renderer.listen(insightsSection, 'mousemove', updateVisibility);
    this.unlistenInsightsMouseLeave = this.renderer.listen(insightsSection, 'mouseleave', () => {
      insightsSection.style.setProperty('--insights-nav-left-visibility', '0');
      insightsSection.style.setProperty('--insights-nav-right-visibility', '0');
    });

    insightsSection.style.setProperty('--insights-nav-left-visibility', '0');
    insightsSection.style.setProperty('--insights-nav-right-visibility', '0');
  }

  private setupOfferingsNavigationVisibility(): void {
    const offeringsSection = this.el.nativeElement.querySelector('.offerings-section') as HTMLElement | null;
    if (!offeringsSection) return;

    const updateVisibility = (event: MouseEvent) => {
      const rect = offeringsSection.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const pointerPercent = (x / rect.width) * 100;

      const leftRatio = Math.max(0, Math.min(1, (30 - pointerPercent) / 30));
      const rightRatio = Math.max(0, Math.min(1, (pointerPercent - 70) / 30));

      offeringsSection.style.setProperty('--offerings-nav-left-visibility', leftRatio.toFixed(3));
      offeringsSection.style.setProperty('--offerings-nav-right-visibility', rightRatio.toFixed(3));
    };

    this.unlistenOfferingsMouseMove = this.renderer.listen(offeringsSection, 'mousemove', updateVisibility);
    this.unlistenOfferingsMouseLeave = this.renderer.listen(offeringsSection, 'mouseleave', () => {
      offeringsSection.style.setProperty('--offerings-nav-left-visibility', '0');
      offeringsSection.style.setProperty('--offerings-nav-right-visibility', '0');
    });

    offeringsSection.style.setProperty('--offerings-nav-left-visibility', '0');
    offeringsSection.style.setProperty('--offerings-nav-right-visibility', '0');
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
    this.analyticsService.trackEvent('booking_modal_open', { source: 'home' });
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

  onPrevInsights() {
    if (!this.isBrowser) return;
    const insightsSwiperEl = this.el.nativeElement.querySelector('.latest-insights swiper-container');
    insightsSwiperEl?.swiper?.slidePrev();
  }

  onNextInsights() {
    if (!this.isBrowser) return;
    const insightsSwiperEl = this.el.nativeElement.querySelector('.latest-insights swiper-container');
    insightsSwiperEl?.swiper?.slideNext();
  }

  onPrevOfferings() {
    if (!this.isBrowser) return;
    const offeringsSwiperEl = this.el.nativeElement.querySelector('.offerings-section swiper-container');
    offeringsSwiperEl?.swiper?.slidePrev();
  }

  onNextOfferings() {
    if (!this.isBrowser) return;
    const offeringsSwiperEl = this.el.nativeElement.querySelector('.offerings-section swiper-container');
    offeringsSwiperEl?.swiper?.slideNext();
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
