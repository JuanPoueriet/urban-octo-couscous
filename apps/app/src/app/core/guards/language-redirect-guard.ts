import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CookieService } from 'ngx-cookie-service';

@Injectable({ providedIn: 'root' })
export class LanguageRedirectService {
  constructor(
    private router: Router,
    private translate: TranslateService,
    private cookieService: CookieService,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  redirect(state: RouterStateSnapshot): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const defaultLang = 'en';
      const supportedLangs = this.translate.getLangs();

      // 1. Intentar obtener el idioma desde cookies o localStorage (visitas anteriores)
      let storedLang = this.cookieService.get('lang') || localStorage.getItem('jsl_lang');

      // 2. Si no está, detectar el idioma del navegador
      if (!storedLang) {
        const browserLang = this.translate.getBrowserLang() || '';
        storedLang = supportedLangs.includes(browserLang)
          ? browserLang
          : defaultLang;
      }

      // 3. Validar que el idioma esté soportado
      const langToUse =
        storedLang && supportedLangs.includes(storedLang)
          ? storedLang
          : defaultLang;

      // Construir la nueva URL preservando la ruta original
      const targetUrl = `/${langToUse}${state.url === '/' ? '' : state.url}`;

      // Redirigir a la ruta con el idioma, manteniendo la URL limpia
      this.router.navigateByUrl(targetUrl, { replaceUrl: true });
    }
    // Prevenimos la navegación a la ruta vacía, ya que la redirección se encargará.
    return false;
  }
}

export const languageRedirectGuard: CanActivateFn = (route, state) => {
  return inject(LanguageRedirectService).redirect(state);
};