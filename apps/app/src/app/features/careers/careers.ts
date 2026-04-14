import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { CtaComponent } from '@shared/components/cta/cta';
import { DataService, CareerPosition } from '@core/services/data.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'jsl-careers',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule,
    AnimateOnScroll,
    CtaComponent,
    NgOptimizedImage
  ],
  templateUrl: './careers.html',
  styleUrl: './careers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Careers implements OnInit {

  private dataService = inject(DataService);
  public positions$!: Observable<CareerPosition[]>;

  // Beneficios de trabajar en JSL
  benefits = [
    { key: 'BENEFIT_1', icon: 'Laptop' },
    { key: 'BENEFIT_2', icon: 'Network' },
    { key: 'BENEFIT_3', icon: 'Brain' },
    { key: 'BENEFIT_4', icon: 'Plane' }
  ];

  constructor() { }

  ngOnInit() {
    this.positions$ = this.dataService.getCareersPositions();
  }
}