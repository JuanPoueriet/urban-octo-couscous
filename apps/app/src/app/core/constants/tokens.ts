import { InjectionToken } from '@angular/core';

export const BASE_URL = new InjectionToken<string>('BASE_URL');
export const RESPONSE = new InjectionToken<any>('RESPONSE');

/** GA4 Measurement ID (e.g. G-XXXXXXXXXX). Provided by server.ts from process.env.GA_MEASUREMENT_ID. */
export const GA_MEASUREMENT_ID = new InjectionToken<string>('GA_MEASUREMENT_ID', {
  providedIn: 'root',
  factory: () => '',
});

/** Google Search Console HTML verification token. Provided by server.ts from process.env.GSC_VERIFICATION_TOKEN. */
export const GSC_VERIFICATION_TOKEN = new InjectionToken<string>('GSC_VERIFICATION_TOKEN', {
  providedIn: 'root',
  factory: () => '',
});
