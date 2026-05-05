import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, filter } from 'rxjs';

export interface LanguageSuggestion {
  code: string;
  name: string;
  currentName: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageSuggestionService {
  private suggestionSubject = new BehaviorSubject<LanguageSuggestion | null>(null);
  suggestion$ = this.suggestionSubject.asObservable();

  private readonly PREFERRED_LANG_COOKIE = 'jsl_user_preferred_lang';
  private readonly DISMISSED_SESSION_KEY = 'jsl_lang_suggestion_dismissed';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private translate: TranslateService,
    private cookieService: CookieService,
    private router: Router
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        // Delay to allow TranslateService to stabilize and guards to finish
        setTimeout(() => this.checkSuggestion(), 500);
      });
    }
  }

  private checkSuggestion() {
    if (!isPlatformBrowser(this.platformId)) return;

    // Avoid showing if already dismissed in this session
    if (sessionStorage.getItem(this.DISMISSED_SESSION_KEY)) {
      this.suggestionSubject.next(null);
      return;
    }

    const currentUrlLang = this.router.url.split('/')[1];
    const supportedLangs = this.translate.getLangs();

    if (!supportedLangs.includes(currentUrlLang)) {
      this.suggestionSubject.next(null);
      return;
    }

    const preferredLang = this.getPreferredLanguage(supportedLangs, currentUrlLang);

    if (
      preferredLang &&
      preferredLang !== currentUrlLang &&
      supportedLangs.includes(preferredLang)
    ) {
      this.suggestionSubject.next({
        code: preferredLang,
        name: this.getLanguageName(preferredLang),
        currentName: this.getLanguageName(currentUrlLang),
      });
    } else {
      this.suggestionSubject.next(null);
    }
  }

  private getPreferredLanguage(supportedLangs: string[], currentUrlLang: string): string | null {
    // 1. Prioritize browser/device languages for contextual UX suggestions.
    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];

    for (const lang of browserLanguages) {
      const normalized = lang.toLowerCase().split('-')[0];
      if (supportedLangs.includes(normalized) && normalized !== currentUrlLang) {
        return normalized;
      }
    }

    // 2. Fallback to explicit preference only if it differs from current URL language.
    const cookieLang = this.cookieService.get(this.PREFERRED_LANG_COOKIE)?.toLowerCase();
    if (cookieLang && supportedLangs.includes(cookieLang) && cookieLang !== currentUrlLang) {
      return cookieLang;
    }

    return null;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'en': 'English',
      'es': 'Español',
      'fr': 'Français',
      'de': 'Deutsch',
      'it': 'Italiano',
      'pt': 'Português',
      'ar': 'العربية',
      'zh': '中文',
      'ja': '日本語',
      'ko': '한국어',
      'ht': 'Kreyòl Ayisyen'
    };
    return names[code] || code.toUpperCase();
  }

  dismiss() {
    sessionStorage.setItem(this.DISMISSED_SESSION_KEY, 'true');
    this.suggestionSubject.next(null);
  }

  switchToPreferred(code: string) {
    this.cookieService.set('lang', code, { expires: 365, path: '/' });
    this.cookieService.set(this.PREFERRED_LANG_COOKIE, code, { expires: 365, path: '/' });

    const currentUrl = this.router.url;
    const urlParts = currentUrl.split('/');
    urlParts[1] = code;

    this.dismiss();
    this.router.navigateByUrl(urlParts.join('/'));
  }
}
