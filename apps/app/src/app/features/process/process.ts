import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { CtaComponent } from '@shared/components/cta/cta';
import { DataService } from '@core/services/data.service';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'jsl-process',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    LucideAngularModule,
    AnimateOnScroll,
    CtaComponent
  ],
  templateUrl: './process.html',
  styleUrl: './process.scss'
})
export class Process {
  
  private dataService = inject(DataService);
  public processSteps = toSignal(this.dataService.getProcessSteps(), { initialValue: [] });


}