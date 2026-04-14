import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LanguageSwitcher } from './language-switcher';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

describe('LanguageSwitcher', () => {
  let component: LanguageSwitcher;
  let fixture: ComponentFixture<LanguageSwitcher>;
  let translateService: TranslateService;

  // Mock del TranslateService
  const mockTranslateService = {
    use: jasmine.createSpy('use'),
    addLangs: jasmine.createSpy('addLangs'),
    setDefaultLang: jasmine.createSpy('setDefaultLang'),
    currentLang: 'es',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcher, TranslateModule.forRoot()],
      providers: [
        { provide: TranslateService, useValue: mockTranslateService }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LanguageSwitcher);
    component = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});