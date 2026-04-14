// src/app/features/industries/industries.ts
import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-industries',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    LucideAngularModule,
    AnimateOnScroll,
    CtaComponent // <-- Importar CTA
  ],
  templateUrl: './industries.html',
  styleUrl: './industries.scss'
})
export class Industries implements OnInit {
  public currentLang: string;

  // Lista de industrias
  industries = [
    {
      key: 'RETAIL',
      icon: 'ShoppingCart',
      image: 'https://images.unsplash.com/photo-1528698827591-e19ccd7bc23d?fit=crop&w=600&q=80'
    },
    {
      key: 'LOGISTICS',
      icon: 'Truck',
      image: 'https://images.unsplash.com/photo-1577412637208-51bbf66c2d42?fit=crop&w=600&q=80'
    },
    {
      key: 'FINTECH',
      icon: 'Landmark',
      image: 'https://images.unsplash.com/photo-1560520031-3a4dc4e0a9C6?fit=crop&w=600&q=80'
    },
    {
      key: 'HEALTH',
      icon: 'HeartPulse',
      image: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?fit=crop&w=600&q=80'
    }
  ];

  constructor(@Inject(TranslateService) private translate: TranslateService) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
  }

  ngOnInit() {
    this.translate.onLangChange.subscribe(event => this.currentLang = event.lang);
  }
}