import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-virteex-landing',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, CtaComponent],
  templateUrl: './virteex-landing.html',
  styleUrl: './virteex-landing.scss'
})
export class VirteexLanding {}
