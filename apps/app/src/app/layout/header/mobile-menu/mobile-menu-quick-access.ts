import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'jsl-mobile-menu-quick-access',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule, LucideAngularModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="mobile-quick-access">
      <h3 class="quick-access-title">{{ 'HEADER.QUICK_ACCESS' | translate }}</h3>
      <div class="quick-access-grid">
        <a [routerLink]="[currentLang, 'contact']" routerLinkActive="active" class="quick-tile" (click)="onClose.emit()">
          <div class="tile-icon"><lucide-icon name="Mail"></lucide-icon></div>
          <span>{{ 'HEADER.QUICK_CONTACT' | translate }}</span>
        </a>
        <a [routerLink]="[currentLang, 'pricing']" routerLinkActive="active" class="quick-tile" (click)="onClose.emit()">
          <div class="tile-icon"><lucide-icon name="CircleDollarSign"></lucide-icon></div>
          <span>{{ 'HEADER.QUICK_PRICING' | translate }}</span>
        </a>
        <a [routerLink]="[currentLang, 'faq']" routerLinkActive="active" class="quick-tile" (click)="onClose.emit()">
          <div class="tile-icon"><lucide-icon name="HelpCircle"></lucide-icon></div>
          <span>{{ 'HEADER.QUICK_FAQ' | translate }}</span>
        </a>
        <a
          href="https://support.jsl.technology"
          target="_blank"
          rel="noopener noreferrer"
          class="quick-tile"
          (click)="onClose.emit()"
          [attr.aria-label]="('HEADER.QUICK_SUPPORT' | translate) + ' (' + ('ARIA.EXTERNAL_LINK' | translate) + ')'"
        >
          <div class="tile-icon"><lucide-icon name="Headphones"></lucide-icon></div>
          <span>{{ 'HEADER.QUICK_SUPPORT' | translate }}</span>
          <lucide-icon name="ExternalLink" class="external-icon-sm"></lucide-icon>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .external-icon-sm {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 12px;
      height: 12px;
      opacity: 0.5;
    }
    .quick-tile { position: relative; }
  `]
})
export class MobileMenuQuickAccess {
  @Input() currentLang = 'en';
  @Output() onClose = new EventEmitter<void>();
}
