import { Component, OnInit, ChangeDetectionStrategy, inject, signal, computed, OnDestroy } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { CtaComponent } from '@shared/components/cta/cta';
import { DataService, FaqItem } from '@core/services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { Seo } from '@core/services/seo';

@Component({
  selector: 'jsl-faq',
  standalone: true,
  imports: [TranslateModule, LucideAngularModule, AnimateOnScroll, CtaComponent],
  templateUrl: './faq.html',
  styleUrl: './faq.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Faq implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  private translate = inject(TranslateService);
  private seoService = inject(Seo);

  public openQuestionIndex = signal<number | null>(null);
  public activeCategory = signal<string>('all');

  private langSub: Subscription | undefined;

  allItems = toSignal(this.dataService.getFaqItems(), { initialValue: [] as FaqItem[] });

  categories = [
    { key: 'all',      labelKey: 'FAQ.CAT_ALL'       },
    { key: 'services', labelKey: 'FAQ.CAT_SERVICES'  },
    { key: 'pricing',  labelKey: 'FAQ.CAT_PRICING'   },
    { key: 'process',  labelKey: 'FAQ.CAT_PROCESS'   },
    { key: 'technical', labelKey: 'FAQ.CAT_TECHNICAL' },
  ];

  filteredItems = computed(() => {
    const cat = this.activeCategory();
    const items = this.allItems();
    return cat === 'all' ? items : items.filter(i => i.category === cat);
  });

  ngOnInit() {
    this.langSub = this.translate.onLangChange.subscribe(() => this.updateFaqSchema());
    this.updateFaqSchema();
  }

  ngOnDestroy() { this.langSub?.unsubscribe(); }

  setCategory(key: string) {
    this.activeCategory.set(key);
    this.openQuestionIndex.set(null);
  }

  toggleQuestion(index: number) {
    this.openQuestionIndex.set(this.openQuestionIndex() === index ? null : index);
  }

  private updateFaqSchema() {
    const items = this.allItems();
    if (!items.length) return;
    const keys = [...items.map(i => i.questionKey), ...items.map(i => i.answerKey)];
    this.translate.get(keys).subscribe(t => {
      this.seoService.setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map(item => ({
          '@type': 'Question',
          name: t[item.questionKey],
          acceptedAnswer: { '@type': 'Answer', text: t[item.answerKey] }
        }))
      }, 'faq-schema');
    });
  }
}
