import { Component, OnInit, ChangeDetectionStrategy, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { CtaComponent } from '@shared/components/cta/cta';
import { DataService, FaqItem } from '@core/services/data.service';
import { Observable, Subscription } from 'rxjs';
import { Seo } from '@core/services/seo';

@Component({
  selector: 'jsl-faq',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule,
    AnimateOnScroll,
    CtaComponent
  ],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Faq implements OnInit, OnDestroy {

  private dataService = inject(DataService);
  private translate = inject(TranslateService);
  private seoService = inject(Seo);
  public faqItems$!: Observable<FaqItem[]>;

  // Signal para manejar qué pregunta está abierta
  public openQuestionIndex = signal<number | null>(null);

  private langSub: Subscription | undefined;
  private faqItems: FaqItem[] = [];


  ngOnInit() {
    this.faqItems$ = this.dataService.getFaqItems();

    this.faqItems$.subscribe(items => {
      this.faqItems = items;
      this.updateFaqSchema();
    });

    this.langSub = this.translate.onLangChange.subscribe(() => {
      this.updateFaqSchema();
    });
  }

  ngOnDestroy() {
    this.langSub?.unsubscribe();
  }

  private updateFaqSchema() {
    if (!this.faqItems.length) return;

    const questionKeys = this.faqItems.map(item => item.questionKey);
    const answerKeys = this.faqItems.map(item => item.answerKey);

    this.translate.get([...questionKeys, ...answerKeys]).subscribe(translations => {
      const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': this.faqItems.map(item => ({
          '@type': 'Question',
          'name': translations[item.questionKey],
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': translations[item.answerKey]
          }
        }))
      };
      this.seoService.setJsonLd(faqSchema, 'faq-schema');
    });
  }

  // Método para abrir/cerrar el acordeón
  toggleQuestion(index: number) {
    if (this.openQuestionIndex() === index) {
      // Si ya está abierta, ciérrala
      this.openQuestionIndex.set(null);
    } else {
      // Si está cerrada, ábrela
      this.openQuestionIndex.set(index);
    }
  }
}