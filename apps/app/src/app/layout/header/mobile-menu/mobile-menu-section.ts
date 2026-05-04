import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { MobileMenuLink } from './mobile-menu.constants';

@Component({
  selector: 'jsl-mobile-menu-section',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, TranslateModule, LucideAngularModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="mobile-accordion" [class.expanded]="isExpanded">
      <button
        [id]="'accordion-' + sectionId + '-header'"
        class="accordion-header"
        (click)="onToggle.emit(sectionId)"
        [attr.aria-expanded]="isExpanded"
        [attr.aria-controls]="'accordion-' + sectionId + '-content'"
      >
        <span>{{ sectionTitleKey | translate }}</span>
        <span class="sr-only">
          {{ (isExpanded ? 'ARIA.EXPANDED' : 'ARIA.COLLAPSED') | translate }}
        </span>
        <lucide-icon name="ChevronDown" class="chevron"></lucide-icon>
      </button>
      <div
        [id]="'accordion-' + sectionId + '-content'"
        class="accordion-content"
        role="region"
        [attr.aria-labelledby]="'accordion-' + sectionId + '-header'"
      >
        <ul class="mobile-links-list">
          @for (link of links; track link.key) {
            @if (shouldShowLink(link.key)) {
              <li>
                @if (link.route) {
                  <a [routerLink]="link.route" routerLinkActive="active" (click)="handleRouteClick(link.route, link.key, $event)">
                    <lucide-icon [name]="link.icon"></lucide-icon>
                    {{ link.key | translate }}
                  </a>
                } @else if (link.href) {
                  <a
                    [href]="link.href"
                    target="_blank"
                    rel="noopener noreferrer"
                    (click)="onClose.emit()"
                    [attr.aria-label]="(link.key | translate) + ' (' + ('ARIA.EXTERNAL_LINK' | translate) + ')'"
                  >
                    <lucide-icon [name]="link.icon"></lucide-icon>
                    {{ link.key | translate }}
                    <lucide-icon name="ExternalLink" class="external-icon-inline"></lucide-icon>
                  </a>
                }
              </li>
            }
          }
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .external-icon-inline {
      width: 14px;
      height: 14px;
      margin-inline-start: auto;
      opacity: 0.6;
    }
  `]
})
export class MobileMenuSection {
  @Input() sectionId = '';
  @Input() sectionTitleKey = '';
  @Input() isExpanded = false;
  @Input() links: MobileMenuLink[] = [];
  @Input() searchQuery = '';

  @Output() onToggle = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();
  @Output() onRouteNavigate = new EventEmitter<{ route: string[]; source: string }>();

  @Input() shouldShowLinkFn!: (linkKey: string) => boolean;

  shouldShowLink(linkKey: string): boolean {
    return this.shouldShowLinkFn ? this.shouldShowLinkFn(linkKey) : true;
  }

  handleRouteClick(route: string[], key: string, event: Event): void {
    event.preventDefault();
    this.onRouteNavigate.emit({ route, source: key });
  }
}
