import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { ALL_ICONS } from '@core/constants/icons';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule],
  templateUrl: './cookie-banner.html',
  styleUrls: ['./cookie-banner.scss']
})
export class CookieBannerComponent implements OnInit {
  isVisible = signal(false);
  readonly icons = ALL_ICONS;

  constructor(private cookieService: CookieService) {}

  ngOnInit(): void {
    const consent = this.cookieService.get('cookie-consent');
    if (!consent) {
      // Delay slightly to not jar the user immediately
      setTimeout(() => {
        this.isVisible.set(true);
      }, 1000);
    }
  }

  accept(): void {
    this.cookieService.set('cookie-consent', 'true', 365);
    this.isVisible.set(false);
    // Here you would trigger loading of third-party scripts (GA, etc.)
  }

  decline(): void {
    this.cookieService.set('cookie-consent', 'false', 365);
    this.isVisible.set(false);
  }
}
