// src/app/layout/language-switcher/language-switcher.ts

import { Component, Inject, OnInit, OnDestroy, ElementRef, Input } from '@angular/core';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, NavigationEnd } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ClickOutsideDirective } from '@shared/directives/click-outside';
import { LanguageSuggestionComponent } from '../../shared/components/language-suggestion/language-suggestion';

@Component({
  selector: 'jsl-language-switcher',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    RouterLink,
    LucideAngularModule,
    ClickOutsideDirective,
    LanguageSuggestionComponent
  ],
  templateUrl: './language-switcher.html',
  styleUrl: './language-switcher.scss',
})
export class LanguageSwitcher implements OnInit, OnDestroy {
  @Input() allowSuggestion = false;

  public currentLang = 'es';
  public isDropdownOpen = false;
  public languages: { code: string; name: string }[] = [];
  public opensUp = false;

  private routerSubscription: Subscription | undefined;
  private currentRouteWithoutLang: string[] = [];

  constructor(
    @Inject(TranslateService) public translate: TranslateService,
    private router: Router,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.setupLanguages();

    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentLang = this.translate.currentLang || 'es';
        this.updateCurrentRoute(event.urlAfterRedirects);
        this.closeDropdown();
      });

    this.updateCurrentRoute(this.router.url);
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  private setupLanguages(): void {
    this.languages = this.translate.getLangs().map(lang => ({
      code: lang,
      name: `LANG.${lang.toUpperCase()}_FULL`,
    }));
  }

  private updateCurrentRoute(currentUrl: string): void {
    const segments = currentUrl.split('/');
    this.currentRouteWithoutLang = segments.slice(2);
  }

  public getRouteForLang(langCode: string): string[] {
    return [`/${langCode}`, ...this.currentRouteWithoutLang];
  }

  public setLanguage(langCode: string): void {
    this.translate.use(langCode);
    this.currentLang = langCode;
  }

  toggleDropdown(): void {
    // Calculate position before opening
    if (!this.isDropdownOpen) {
      this.calculateDropdownPosition();
    }
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  private calculateDropdownPosition(): void {
    const elementRect = this.elementRef.nativeElement.getBoundingClientRect();
    const spaceBelow = window.innerHeight - elementRect.bottom;

    // Max height set in SCSS
    const MAX_DROPDOWN_HEIGHT = 280;

    // Estimate dropdown height based on number of languages
    // (approx. 38px per item + some padding)
    const estimatedHeight = this.languages.length * 38 + 16;
    const actualHeight = Math.min(estimatedHeight, MAX_DROPDOWN_HEIGHT);

    // If not enough space below, open upwards
    this.opensUp = spaceBelow < actualHeight;
  }
}