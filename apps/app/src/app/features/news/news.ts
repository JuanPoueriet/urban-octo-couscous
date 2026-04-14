import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { CtaComponent } from '@shared/components/cta/cta';

@Component({
  selector: 'jsl-news',
  standalone: true,
  imports: [CommonModule, TranslateModule, CtaComponent],
  templateUrl: './news.html'
})
export class News {}
