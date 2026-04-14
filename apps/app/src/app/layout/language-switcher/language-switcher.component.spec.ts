import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcher } from './language-switcher';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideZonelessChangeDetection } from '@angular/core';

describe('LanguageSwitcher', () => {
  let component: LanguageSwitcher;
  let fixture: ComponentFixture<LanguageSwitcher>;
  let translateService: TranslateService;

  const mockTranslateService = {
    use: jasmine.createSpy('use'),
    addLangs: jasmine.createSpy('addLangs'),
    setDefaultLang: jasmine.createSpy('setDefaultLang'),
    getLangs: () => ['en', 'es'],
    get: (key: string) => ({ subscribe: (cb: any) => cb(`${key}_translated`) }),
    currentLang: 'es',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcher, TranslateModule.forRoot(), NoopAnimationsModule],
      providers: [
        provideZonelessChangeDetection(),
        { provide: TranslateService, useValue: mockTranslateService },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcher);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
