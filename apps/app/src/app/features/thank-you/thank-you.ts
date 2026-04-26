import { Component, Inject, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { AnimateOnScroll } from '@shared/directives/animate-on-scroll';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-thank-you',
  standalone: true,
  imports: [RouterLink, TranslateModule, LucideAngularModule, AnimateOnScroll],
  templateUrl: './thank-you.html',
  styleUrls: ['./thank-you.scss']
})
export class ThankYou implements OnDestroy {
  currentLang: string;
  private langSub: Subscription;

  nextSteps = [
    { icon: 'Mail',      key: 'CHECK_EMAIL' },
    { icon: 'Calendar',  key: 'SCHEDULE'    },
    { icon: 'BookOpen',  key: 'READ_BLOG'   },
  ];

  socials = [
    { icon: 'Linkedin',  href: 'https://linkedin.com/company/jsl-technology', label: 'LinkedIn' },
    { icon: 'Twitter',   href: 'https://twitter.com/jsltechnology',            label: 'Twitter'  },
    { icon: 'Instagram', href: 'https://instagram.com/jsltechnology',          label: 'Instagram'},
  ];

  constructor(@Inject(TranslateService) private translate: TranslateService) {
    this.currentLang = this.translate.currentLang || this.translate.defaultLang || 'es';
    this.langSub = this.translate.onLangChange.subscribe(e => this.currentLang = e.lang);
  }

  ngOnDestroy() { this.langSub?.unsubscribe(); }
}
