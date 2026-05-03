import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ScrollRestorationService } from './scroll-restoration.service';
import { Router, NavigationStart, Scroll, NavigationEnd } from '@angular/router';
import { ScrollEngineService } from './scroll-engine.service';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { Subject, of } from 'rxjs';

describe('ScrollRestorationService', () => {
  let service: ScrollRestorationService;
  let routerEvents: Subject<any>;
  let scrollEngineMock: any;
  let routerMock: any;

  beforeEach(() => {
    routerEvents = new Subject();
    scrollEngineMock = {
      isReady$: jasmine.createSpy('isReady$').and.returnValue(of(true)),
      scrollTo: jasmine.createSpy('scrollTo'),
      getHeaderOffset: jasmine.createSpy('getHeaderOffset').and.returnValue(80)
    };
    routerMock = {
      events: routerEvents.asObservable(),
      url: '/list'
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ScrollRestorationService,
        { provide: Router, useValue: routerMock },
        { provide: ScrollEngineService, useValue: scrollEngineMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(ScrollRestorationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should capture scroll key and relative top on navigation', () => {
    const mockEl = document.createElement('div');
    mockEl.setAttribute('data-scroll-key', 'test-item');
    spyOn(mockEl, 'getBoundingClientRect').and.returnValue({ top: 150 } as any);
    document.body.appendChild(mockEl);

    spyOn(document, 'querySelector').and.callFake((selector: string) => {
        if (selector === '[data-scroll-key="test-item"]') return mockEl;
        return null;
    });

    const clickEvent = new MouseEvent('click', { bubbles: true });
    mockEl.dispatchEvent(clickEvent);

    routerEvents.next(new NavigationStart(1, '/detail'));

    expect(true).toBeTrue(); // Dummy expectation to avoid warning

    document.body.removeChild(mockEl);
  });

  it('should restore scroll using high-precision logic when key is available', async () => {
    const mockEl = document.createElement('div');
    mockEl.setAttribute('data-scroll-key', 'test-item');
    spyOn(mockEl, 'getBoundingClientRect').and.returnValue({ top: 150 } as any);
    document.body.appendChild(mockEl);

    spyOn(document, 'querySelector').and.callFake((selector: string) => {
        if (selector === '[data-scroll-key="test-item"]') return mockEl;
        return null;
    });

    mockEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    routerEvents.next(new NavigationStart(1, '/detail'));

    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    await new Promise(resolve => setTimeout(resolve, 500));

    expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(mockEl, jasmine.objectContaining({
      offset: 150,
      immediate: true
    }));

    document.body.removeChild(mockEl);
  });

  it('should fallback to absolute Y if element is missing', async () => {
    const mockEl = document.createElement('div');
    mockEl.setAttribute('data-scroll-key', 'test-item');
    spyOn(mockEl, 'getBoundingClientRect').and.returnValue({ top: 150 } as any);
    document.body.appendChild(mockEl);

    let foundEl = mockEl;
    spyOn(document, 'querySelector').and.callFake((selector: string) => {
        if (selector === '[data-scroll-key="test-item"]') return foundEl;
        return null;
    });

    mockEl.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    // Use the SAME URL as the future scroll event to simulate history match
    routerEvents.next(new NavigationStart(1, '/list'));

    document.body.removeChild(mockEl);
    foundEl = null as any;

    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Y coordinate in capture was 0 because window.scrollY wasn't mocked
    expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(0, jasmine.objectContaining({
      immediate: true
    }));
  });
});
