import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { DataService } from '@core/services/data.service';
import { CtaComponent } from '@shared/components/cta/cta';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'jsl-about-us',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule,
    AnimateOnScroll,
    CtaComponent
  ],
  templateUrl: './about-us.html',
  styleUrl: './about-us.scss'
})
export class AboutUs {
  
  private dataService = inject(DataService);
  public teamMembers = toSignal(this.dataService.getTeamMembers(), { initialValue: [] });

  coreValues = [
    { key: 'MISSION', icon: 'Target' },
    { key: 'VISION', icon: 'Eye' },
    { key: 'VALUES', icon: 'Gem' }
  ];

  constructor() {}
}