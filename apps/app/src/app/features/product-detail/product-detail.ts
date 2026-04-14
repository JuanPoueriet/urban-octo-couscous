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
    private titleService: Title
    // --- CAMBIO: 'Location' eliminado del constructor ---
  ) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
  }

  ngOnInit(): void {
    this.langSub = this.translate.onLangChange.subscribe(event => {
      this.currentLang = event.lang;
      this.updateTitle();
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
      this.updateTitle();
    });
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }

  private updateTitle(): void {
    if (this.productData) {
      const titleKey = `PRODUCTS.${this.productData.key}_TITLE`;
      this.translate.get(titleKey).subscribe(translatedTitle => {
        this.titleService.setTitle(`${translatedTitle} | JSL Technology`);
      });
    }
  }

  // --- CAMBIO: Método 'goBack()' eliminado ---
}