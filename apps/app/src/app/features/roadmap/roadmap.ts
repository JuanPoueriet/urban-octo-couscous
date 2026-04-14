import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { TimelineComponent, TimelineItem } from '@shared/components/timeline/timeline';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-roadmap',
  standalone: true,
  imports: [CommonModule, TranslateModule, TimelineComponent, CtaComponent],
  templateUrl: './roadmap.html',
  styleUrl: './roadmap.scss'
})
export class Roadmap {
  roadmapItems: TimelineItem[] = [
    {
      date: 'Q4 2024',
      titleKey: 'Virteex AI Assistant',
      descKey: 'AI-powered insights for ERP data.',
      status: 'planned'
    },
    {
      date: 'Q3 2024',
      titleKey: 'Mobile POS V2',
      descKey: 'Complete redesign of the Point of Sale mobile experience.',
      status: 'current'
    },
    {
      date: 'Q2 2024',
      titleKey: 'Global Payments Integration',
      descKey: 'Support for Stripe and PayPal in all regions.',
      status: 'completed'
    },
    {
      date: 'Q1 2024',
      titleKey: 'JSL Cloud Launch',
      descKey: 'Official launch of our managed cloud infrastructure.',
      status: 'completed'
    }
  ];
}
