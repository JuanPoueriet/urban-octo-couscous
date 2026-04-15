import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { Seo } from '@core/services/seo';

@Component({
  selector: 'app-server-error',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LucideAngularModule],
  templateUrl: './server-error.html',
  styleUrls: ['./server-error.scss']
})
export class ServerError {
  constructor(private seoService: Seo) {
    this.seoService.updateRobotsTag('noindex, follow');
  }
}
