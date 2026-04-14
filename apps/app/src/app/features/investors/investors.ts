import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-investors',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, CtaComponent],
  templateUrl: './investors.html',
  styleUrl: './investors.scss'
})
export class Investors {}
