import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CtaComponent } from '@shared/components/cta/cta';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'jsl-press',
  standalone: true,
  imports: [CommonModule, TranslateModule, CtaComponent, LucideAngularModule],
  templateUrl: './press.html',
  styleUrl: './press.scss'
})
export class Press {
  assets = [
    { name: 'JSL Logo Pack', type: 'ZIP', size: '2.5 MB' },
    { name: 'Executive Team Photos', type: 'ZIP', size: '15 MB' },
    { name: 'Brand Guidelines', type: 'PDF', size: '5.2 MB' }
  ];

  mentions = [
    { outlet: 'TechCrunch', title: 'JSL Technology disrupts the Caribbean ERP market', date: 'Oct 2024' },
    { outlet: 'Forbes', title: 'Top 10 Nearshore Software Companies to Watch', date: 'Sep 2024' }
  ];
}
