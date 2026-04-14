import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { CtaComponent } from '@shared/components/cta/cta';
import { DataService, FaqItem } from '@core/services/data.service';
import { Observable } from 'rxjs';

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
export class Faq implements OnInit {

  private dataService = inject(DataService);
  public faqItems$!: Observable<FaqItem[]>;

  // Signal para manejar qué pregunta está abierta
  public openQuestionIndex = signal<number | null>(null);

  constructor() { }

  ngOnInit() {
    this.faqItems$ = this.dataService.getFaqItems();
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