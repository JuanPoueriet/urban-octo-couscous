import { TestBed } from '@angular/core/testing';
import { DirectionService } from './direction.service';
import { TranslateService } from '@ngx-translate/core';
import { EventEmitter, provideZonelessChangeDetection } from '@angular/core';
import { DOCUMENT } from '@angular/common';

describe('DirectionService', () => {
  let service: DirectionService;
  let translateServiceMock: any;
  let documentMock: any;
  let onLangChangeEmitter: EventEmitter<any>;

  beforeEach(() => {
    onLangChangeEmitter = new EventEmitter<any>();
    translateServiceMock = {
      currentLang: 'en',
      getDefaultLang: () => 'en',
      onLangChange: onLangChangeEmitter
    };

    documentMock = {
      documentElement: {
        setAttribute: jasmine.createSpy('setAttribute')
      },
      body: {
        setAttribute: jasmine.createSpy('setAttribute')
      }
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        DirectionService,
        { provide: TranslateService, useValue: translateServiceMock },
        { provide: DOCUMENT, useValue: documentMock }
      ]
    });
    service = TestBed.inject(DirectionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set direction to ltr for English initially', () => {
    expect(service.isRtl()).toBeFalse();
    expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('dir', 'ltr');
    expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('lang', 'en');
  });

  it('should update direction to rtl when language changes to Arabic', () => {
    onLangChangeEmitter.emit({ lang: 'ar', translations: {} });
    expect(service.isRtl()).toBeTrue();
    expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('dir', 'rtl');
    expect(documentMock.documentElement.setAttribute).toHaveBeenCalledWith('lang', 'ar');
  });

  it('should update direction back to ltr when language changes to English', () => {
    // First switch to ar
    onLangChangeEmitter.emit({ lang: 'ar', translations: {} });

    // Then back to en
    onLangChangeEmitter.emit({ lang: 'en', translations: {} });
    expect(service.isRtl()).toBeFalse();
    // The spy tracks all calls. The last ones should be ltr
    const calls = documentMock.documentElement.setAttribute.calls.all();
    const lastDirCall = calls.filter((c: any) => c.args[0] === 'dir').pop();
    expect(lastDirCall.args[1]).toBe('ltr');
  });
});
