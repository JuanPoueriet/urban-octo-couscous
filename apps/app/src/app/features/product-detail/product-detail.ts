// src/app/features/product-detail/product-detail.ts
import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common'; // --- CAMBIO: Location se eliminará ---
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription, Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { DataService, Product } from '@core/services/data.service';
import { Title } from '@angular/platform-browser';
import { CtaComponent } from '@shared/components/cta/cta'; // --- CAMBIO: Importar CTA ---
import { Seo } from '@core/services/seo';

@Component({
  selector: 'jsl-product-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule,
    CtaComponent // --- CAMBIO: Añadir CTA ---
  ],
  templateUrl: './product-detail.html'
})
export class ProductDetail implements OnInit, OnDestroy {
  
  public currentLang: string = 'es';
  public product$: Observable<Product | undefined> | undefined;
  
  private langSub: Subscription | undefined;
  private productData: Product | undefined;

  constructor(
    @Inject(TranslateService) private translate: TranslateService,
    private route: ActivatedRoute,
    private dataService: DataService,
    private titleService: Title,
    private seoService: Seo
    // --- CAMBIO: 'Location' eliminado del constructor ---
  ) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
  }

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(event => {
      this.currentLang = event.lang;
      if (this.productData) this.updateMetadata(this.productData);
    });

    this.product$ = this.route.paramMap.pipe(
      switchMap(params => {
        const slug = params.get('slug');
        if (slug) {
          return this.dataService.getProductBySlug(slug); // <-- getProductBySlug
        }
        return of(undefined);
      })
    );
    
    this.product$.subscribe(product => {
      this.productData = product;
      if (product) this.updateMetadata(product);
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private updateMetadata(product: Product): void {
    const titleKey = `PRODUCTS.${product.key}_TITLE`;
    const descKey = `PRODUCTS.${product.key}_DESC`;
    const baseUrl = this.seoService.getBaseUrl();
    const url = `${baseUrl}/${this.currentLang}/products/${product.slug}`;

    this.translate.get([titleKey, descKey, 'COMMON.BREADCRUMB_HOME', 'HEADER.PRODUCTS', 'COMMON.DEFAULT_DESCRIPTION']).subscribe(translations => {
      const title = `${translations[titleKey]} | JSL Technology`;
      const description = translations[descKey] !== descKey ? translations[descKey] : translations['COMMON.DEFAULT_DESCRIPTION'];

      this.seoService.updateTitleAndDescription(title, description);

      // --- Breadcrumbs Schema ---
      this.seoService.setBreadcrumbs([
        { name: translations['COMMON.BREADCRUMB_HOME'], item: `/${this.currentLang}/home` },
        { name: translations['HEADER.PRODUCTS'], item: `/${this.currentLang}/products` },
        { name: translations[titleKey], item: `/${this.currentLang}/products/${product.slug}` }
      ]);

      this.seoService.updateCanonicalTag(url);
      this.seoService.updateSocialTags(
        title,
        description,
        url,
        `${baseUrl}/assets/imgs/jsl-social-default.jpg` // Using default social image
      );

      // --- Product Schema ---
      const productSchema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': translations[titleKey],
        'description': description,
        'brand': {
          '@type': 'Brand',
          'name': 'JSL Technology'
        },
        'offers': {
          '@type': 'Offer',
          'url': url,
          'availability': 'https://schema.org/InStock',
          'priceCurrency': 'EUR',
          'price': '0.00' // Placeholder as it's a B2B service usually
        }
      };
      this.seoService.setJsonLd(productSchema);
    });
  }

  // --- CAMBIO: Método 'goBack()' eliminado ---
}