// src/app/features/not-found/not-found.ts
import { Component, Inject, OnDestroy } from '@angular/core';
// 1. Importar NgOptimizedImage
import { CommonModule, NgOptimizedImage } from '@angular/common'; 
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { Seo } from '@core/services/seo';

@Component({
  selector: 'jsl-not-found',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LucideAngularModule,
    AnimateOnScroll,
    NgOptimizedImage // 2. Añadir a imports
  ],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss'
})
export class NotFound implements OnDestroy {
  public currentLang: string;
  private langSub: Subscription;
  
  // 3. Ilustración moderna y profesional de Storyset by Freepik
  public illustrationUrl = 'https://stories.freepik.com/storage/v1/product/404-error-with-a-cute-animal-pana/404-error-with-a-cute-animal-pana.svg';

  constructor(
    @Inject(TranslateService) private translate: TranslateService,
    private seoService: Seo
  ) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
    this.langSub = this.translate.onLangChange.subscribe(event => this.currentLang = event.lang);

    // Set noindex for 404 page
    this.seoService.updateRobotsTag('noindex, follow');
  }

  ngOnDestroy(): void {
    this.langSub?.unsubscribe();
  }
}