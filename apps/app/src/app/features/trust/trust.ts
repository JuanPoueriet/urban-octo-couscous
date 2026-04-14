import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-trust',
  standalone: true,
  imports: [CommonModule, TranslateModule, CtaComponent],
  templateUrl: './trust.html',
  styleUrls: ['./trust.scss']
})
export class Trust {}
