import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  /**
   * Replace with your actual GA4 Measurement ID (G-XXXXXXXXXX).
   * Set via environment variable ANALYTICS_MEASUREMENT_ID at build time,
   * or replace the default placeholder here.
   */
  private readonly measurementId = 'G-XXXXXXXXXX';

  private initialized = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document,
    private router: Router,
  ) {}

  /**
   * Bootstrap GA4. Call once from AppComponent or app initializer.
   * No-ops on the server (SSR safe).
   */
  init(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.initialized) return;
    if (this.measurementId === 'G-XXXXXXXXXX') {
      console.warn('[Analytics] GA4 Measurement ID not configured. Update AnalyticsService.measurementId.');
      return;
    }

    this.loadGtagScript();
    this.trackPageViews();
    this.initialized = true;
  }

  /**
   * Track a GA4 event. No-op if analytics is not initialized.
   *
   * @example
   * analytics.trackEvent('contact_form_submit', { method: 'email' });
   */
  trackEvent(eventName: string, params?: Record<string, unknown>): void {
    if (!isPlatformBrowser(this.platformId) || !this.initialized) return;
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params ?? {});
    }
  }

  /**
   * Track a conversion event (e.g. form submission, CTA click).
   */
  trackConversion(label: string, value?: number): void {
    this.trackEvent('conversion', {
      send_to: `${this.measurementId}/${label}`,
      ...(value !== undefined && { value }),
    });
  }

  /**
   * Manually track a page view (use if automatic tracking is insufficient).
   */
  trackPageView(path: string, title?: string): void {
    this.trackEvent('page_view', {
      page_location: `${this.document.location.origin}${path}`,
      page_path: path,
      ...(title && { page_title: title }),
    });
  }

  private loadGtagScript(): void {
    const existingScript = this.document.getElementById('gtag-script');
    if (existingScript) return;

    // Initialize dataLayer before the async gtag script loads
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', this.measurementId, { send_page_view: false });

    const script = this.document.createElement('script');
    script.id = 'gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    this.document.head.appendChild(script);
  }

  private trackPageViews(): void {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.trackPageView(event.urlAfterRedirects);
      });
  }
}
