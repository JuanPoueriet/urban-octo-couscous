import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'jsl-cookie',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './cookie.html',
  styleUrl: '../legal-page.scss'
})
export class Cookie {}
