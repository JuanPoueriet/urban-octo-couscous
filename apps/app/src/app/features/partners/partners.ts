import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-partners',
  standalone: true,
  imports: [CommonModule, TranslateModule, CtaComponent],
  templateUrl: './partners.html'
})
export class Partners {}
