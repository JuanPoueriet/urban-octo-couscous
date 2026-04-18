// blog-detail.ts
import {
  Component,
  OnInit,
  OnDestroy,
  ViewEncapsulation,
  inject,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  AfterViewChecked,
  AfterViewInit,
  ElementRef,
  Inject,
  PLATFORM_ID,
  ViewChild,
  HostListener,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataService, BlogPost, TeamMember } from '@core/services/data.service';
import { Title } from '@angular/platform-browser';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { CtaComponent } from '@shared/components/cta/cta';
import { WhitepaperDownloadComponent } from '@shared/components/whitepaper-download/whitepaper-download';
import { Card } from '@shared/components/card/card';
import { Seo } from '@core/services/seo';
import { DirectionService } from '@core/services/direction.service';
import { SocialShareComponent } from '@shared/components/social-share/social-share';

// Swiper Web Components
import { Pagination, Autoplay, Navigation, FreeMode } from 'swiper/modules';
import { register } from 'swiper/element/bundle';
register();

@Component({
  selector: 'jsl-blog-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule,
    AnimateOnScroll,
    CtaComponent,
    WhitepaperDownloadComponent,
    Card,
    SocialShareComponent
  ],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BlogDetail
  implements OnInit, OnDestroy, AfterViewChecked, AfterViewInit
{
  public translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private titleService = inject(Title);
  private el = inject(ElementRef);
  @Inject(PLATFORM_ID) private platformId = inject(PLATFORM_ID);
  private seoService = inject(Seo);
  public directionService = inject(DirectionService);

  @ViewChild('copyTooltip') copyTooltip!: ElementRef;
  @ViewChild('bannerImage') bannerImage!: ElementRef;

  public currentLang = 'es';
  public post$: Observable<BlogPost | undefined>;
  public relatedPosts$: Observable<BlogPost[]>;
  public author$: Observable<TeamMember | undefined>;

  public scrollProgress = 0;
  private langSub: Subscription | undefined;
  private postData: BlogPost | undefined;
  private highlighted = false;

  constructor() {
    this.currentLang =
      this.translate.currentLang || this.translate.defaultLang || 'es';

    this.post$ = this.route.paramMap.pipe(
      switchMap((params) => {
        this.highlighted = false;
        this.scrollProgress = 0;
        const slug = params.get('slug');
        return slug ? this.dataService.getPostBySlug(slug) : of(undefined);
      })
    );

    this.relatedPosts$ = this.post$.pipe(
      switchMap((post) => {
        if (!post) return of([]);
        return this.dataService.getRelatedPosts(post.slug, post.tags || []);
      })
    );

    this.author$ = this.post$.pipe(
      switchMap((post) => {
        if (!post) return of(undefined);
        return this.dataService.getTeamMemberByKey(post.authorKey);
      })
    );
  }

  // Función para truncar texto (reemplaza el pipe truncate)
  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Scroll progress calculation
  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!isPlatformBrowser(this.platformId)) return;

    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
    
    this.scrollProgress = Math.min(100, Math.max(0, scrollPercent));
  }

  scrollToTop() {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Image load handler
  onImageLoad() {
    if (this.bannerImage?.nativeElement) {
      this.bannerImage.nativeElement.classList.add('loaded');
    }
  }

  // Copy link functionality
  copyLink() {
    if (!isPlatformBrowser(this.platformId)) return;

    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      const tooltip = this.copyTooltip?.nativeElement;
      if (tooltip) {
        const originalText = tooltip.textContent;
        tooltip.textContent = '¡Copiado!';
        
        setTimeout(() => {
          tooltip.textContent = originalText;
        }, 2000);
      }
    });
  }

  // Swiper initialization
  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      const swiperEl = this.el.nativeElement.querySelector('swiper-container');

      if (swiperEl) {
        Object.assign(swiperEl, {
          modules: [Pagination, Autoplay, Navigation, FreeMode],
          spaceBetween: 24,
          slidesPerView: 'auto',
          centeredSlides: false,
          grabCursor: true,
          freeMode: true,
          pagination: {
            clickable: true,
            dynamicBullets: true,
          },
          breakpoints: {
            320: { slidesPerView: 1.2, spaceBetween: 16 },
            480: { slidesPerView: 1.5, spaceBetween: 20 },
            768: { slidesPerView: 2.2, spaceBetween: 24 },
            1024: { slidesPerView: 3, spaceBetween: 30 },
            1400: { slidesPerView: 3.5, spaceBetween: 30 },
          },
        });

        swiperEl.initialize();
      }
    }, 0);
  }

  // Prism code highlighting
  ngAfterViewChecked(): void {
    if (isPlatformBrowser(this.platformId) && !this.highlighted) {
      const hasContent = this.el.nativeElement.querySelector('.blog-content p');
      if (hasContent) {
        // Usamos import() dinámico para cargar prismjs solo en el navegador
        import('prismjs').then(Prism => {
          setTimeout(() => {
            const prismModule = (Prism as any).default || Prism;
            prismModule.highlightAll();
            this.highlighted = true;
          }, 500);
        }).catch(err => console.error('Error loading PrismJS', err));
      }
    }
  }

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe((event) => {
      this.currentLang = event.lang;
      this.updateMetadata();
    });

    this.post$.subscribe((post) => {
      this.postData = post;
      this.updateMetadata();
    });

    // Initialize scroll progress
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.onWindowScroll(), 100);
    }
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private updateMetadata(): void {
    if (!this.postData) return;

    // Claves para la traducción
    const titleKey = `BLOG.${this.postData.key}_TITLE`;
    const excerptKey = `BLOG.${this.postData.key}_EXCERPT`;

    // URLs
    const baseUrl = this.seoService.getBaseUrl();
    const postUrl = `${baseUrl}/${this.currentLang}/blog/${this.postData.slug}`;

    let imageUrl = this.postData.imageUrl;
    
    if (imageUrl && !imageUrl.startsWith('http')) {
      const assetsIndex = imageUrl.indexOf('assets/');
      if (assetsIndex > -1) {
        const relativePath = imageUrl.substring(assetsIndex);
        imageUrl = `${baseUrl}/${relativePath}`;
      }
    }

    // Traducir título y descripción
    this.translate.get([titleKey, excerptKey, 'COMMON.BREADCRUMB_HOME', 'HEADER.BLOG', 'COMMON.DEFAULT_DESCRIPTION']).subscribe(translations => {
      const translatedTitle = translations[titleKey] && translations[titleKey] !== titleKey ? translations[titleKey] : 'Artículo de JSL Technology';
      const translatedDesc = translations[excerptKey] && translations[excerptKey] !== excerptKey ? translations[excerptKey] : translations['COMMON.DEFAULT_DESCRIPTION'];

      const title = `${translatedTitle} | JSL Technology Blog`;
      this.seoService.updateTitleAndDescription(title, translatedDesc);

      // --- Breadcrumbs Schema ---
      this.seoService.setBreadcrumbs([
        { name: translations['COMMON.BREADCRUMB_HOME'], item: `/${this.currentLang}/home` },
        { name: translations['HEADER.BLOG'], item: `/${this.currentLang}/blog` },
        { name: translatedTitle, item: `/${this.currentLang}/blog/${this.postData?.slug}` }
      ]);
      this.seoService.updateCanonicalTag(postUrl);
      this.seoService.updateSocialTags(
        title,
        translatedDesc,
        postUrl,
        imageUrl,
        'article'
      );

      // --- Datos Estructurados: Article ---
      const articleSchema = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': translatedTitle,
        'description': translatedDesc,
        'image': imageUrl,
        'datePublished': this.postData?.date,
        'dateModified': this.postData?.date,
        'author': {
          '@type': 'Organization',
          'name': 'JSL Technology',
          'url': baseUrl
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'JSL Technology',
          'logo': {
            '@type': 'ImageObject',
            'url': `${baseUrl}/logo.png`
          }
        },
        'url': postUrl,
        'mainEntityOfPage': {
          '@type': 'WebPage',
          '@id': postUrl
        }
      };
      this.seoService.setJsonLd(articleSchema);
    });
  }

  trackBySlug(index: number, post: BlogPost): string {
    return post.slug;
  }
}
