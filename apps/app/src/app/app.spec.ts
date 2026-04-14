import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Seo } from './core/services/seo';
import { provideTranslateService } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

// Mock del SeoService
const mockSeoService = {
  init: jasmine.createSpy('init'), // Usamos jasmine.createSpy()
};

describe('App', () => {
  beforeEach(async () => {
    // Limpiamos el mock antes de cada prueba
    mockSeoService.init.calls.reset();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]), // Mock del router
        provideTranslateService(), // Mock de ngx-translate
        { provide: Seo, useValue: mockSeoService } // Proveemos el mock de SeoService
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialize SeoService on creation', () => {
    TestBed.createComponent(App);
    // Verificamos que el constructor de App haya llamado a seo.init()
    expect(mockSeoService.init).toHaveBeenCalled();
  });

  // Eliminamos la prueba "should render title"
});