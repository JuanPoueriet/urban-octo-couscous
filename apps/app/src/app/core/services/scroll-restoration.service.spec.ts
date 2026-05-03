import { TestBed } from '@angular/core/testing';
import { ScrollRestorationService } from './scroll-restoration.service';
import { Router, NavigationStart, Scroll, NavigationEnd } from '@angular/router';
import { ScrollEngineService } from './scroll-engine.service';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject, of } from 'rxjs';

describe('ScrollRestorationService', () => {
  let service: ScrollRestorationService;
  let routerEvents: Subject<any>;
  let scrollEngineMock: any;
  let routerMock: any;
  let documentMock: Document;

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
    documentMock = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should capture scroll key and relative top on navigation', () => {
    const mockEl = document.createElement('div');
    mockEl.setAttribute('data-scroll-key', 'test-item');
    spyOn(mockEl, 'getBoundingClientRect').and.returnValue({ top: 150 } as any);
    document.body.appendChild(mockEl);

    spyOn(documentMock, 'querySelector').and.callFake((selector: string) => {
        if (selector === '[data-scroll-key="test-item"]') return mockEl;
        return null;
    });

    const clickEvent = new MouseEvent('click', { bubbles: true });
    mockEl.dispatchEvent(clickEvent);

    routerEvents.next(new NavigationStart(1, '/detail'));

    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(mockEl, jasmine.objectContaining({
          offset: 150,
          immediate: true
        }));
        document.body.removeChild(mockEl);
        resolve();
      }, 500);
    });
  });

  it('should use passive tracking if no interaction occurred', () => {
    const mockEl = document.createElement('div');
    mockEl.id = 'passive-item';
    spyOn(mockEl, 'getBoundingClientRect').and.returnValue({ top: 200 } as any);
    document.body.appendChild(mockEl);

    spyOn(documentMock, 'elementFromPoint').and.returnValue(mockEl);
    spyOn(documentMock, 'getElementById').and.callFake((id: string) => {
        if (id === 'passive-item') return mockEl;
        return null;
    });

    // No click/focus event
    routerEvents.next(new NavigationStart(1, '/detail'));

    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(mockEl, jasmine.objectContaining({
          offset: 200,
          immediate: true
        }));
        document.body.removeChild(mockEl);
        resolve();
      }, 500);
    });
  });

  it('should fallback to data-scroll-anchor for high-precision if key is missing', () => {
    const mockEl = document.createElement('div');
    mockEl.setAttribute('data-scroll-anchor', 'anchor-item');
    spyOn(mockEl, 'getBoundingClientRect').and.returnValue({ top: 300 } as any);
    document.body.appendChild(mockEl);

    spyOn(documentMock, 'querySelector').and.callFake((selector: string) => {
        if (selector === '[data-scroll-anchor="anchor-item"]') return mockEl;
        return null;
    });

    const clickEvent = new MouseEvent('click', { bubbles: true });
    mockEl.dispatchEvent(clickEvent);

    routerEvents.next(new NavigationStart(1, '/detail'));

    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(mockEl, jasmine.objectContaining({
          offset: 300,
          immediate: true
        }));
        document.body.removeChild(mockEl);
        resolve();
      }, 500);
    });
  });

  it('should persist and load history from sessionStorage using versioned key', () => {
    const mockHistory = {
      '/test': { y: 100, anchor: null, scrollKey: null, relativeTop: null }
    };
    const storageKey = 'jsl_scroll_history_v1';
    spyOn(sessionStorage, 'getItem').and.callFake((key) => {
        if (key === storageKey) return JSON.stringify(mockHistory);
        return null;
    });
    spyOn(sessionStorage, 'setItem');

    const newService = new ScrollRestorationService(routerMock, scrollEngineMock, 'browser' as any, documentMock);

    const navEnd = new NavigationEnd(2, '/test', '/test');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(100, jasmine.objectContaining({
          immediate: true
        }));
        newService.ngOnDestroy();
        resolve();
      }, 500);
    });
  });

  it('should prune history using LRU policy', () => {
    spyOn(sessionStorage, 'setItem');
    for (let i = 0; i < 100; i++) {
        routerMock.url = `/page-${i}`;
        routerEvents.next(new NavigationStart(i, `/page-${i + 1}`));
    }

    routerMock.url = '/page-100';
    routerEvents.next(new NavigationStart(101, '/page-101'));

    const navEnd = new NavigationEnd(102, '/page-0', '/page-0');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(500, jasmine.objectContaining({
          immediate: true
        }));
        resolve();
      }, 500);
    });
  });

  it('should perform late reconciliation if element shifts', (done) => {
    const mockEl = document.createElement('div');
    mockEl.setAttribute('data-scroll-key', 'late-item');
    // Initial position
    spyOn(mockEl, 'getBoundingClientRect').and.returnValue({ top: 100 } as any);
    document.body.appendChild(mockEl);

    spyOn(documentMock, 'querySelector').and.callFake((selector: string) => {
        if (selector === '[data-scroll-key="late-item"]') return mockEl;
        return null;
    });

    // Capture state
    const clickEvent = new MouseEvent('click', { bubbles: true });
    mockEl.dispatchEvent(clickEvent);
    routerEvents.next(new NavigationStart(1, '/detail'));

    // Restore state
    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(mockEl, jasmine.objectContaining({
            offset: 100,
            immediate: true
        }));

        // Simulate layout shift before late reconciliation
        (mockEl.getBoundingClientRect as jasmine.Spy).and.returnValue({ top: 150 } as any);

        setTimeout(() => {
            // Should have called scrollTo again for reconciliation
            expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(mockEl, jasmine.objectContaining({
                offset: 100,
                immediate: false
            }));
            expect(service.getDiagnostics().lateAdjustments).toBe(1);
            document.body.removeChild(mockEl);
            done();
        }, 700);
    }, 500);
  });

  it('should track restoration metrics', (done) => {
    // 1. Top restoration
    routerEvents.next(new Scroll(new NavigationEnd(1, '/a', '/a'), null, null));

    setTimeout(() => {
        expect(service.getDiagnostics().top).toBe(1);

        // 2. Y restoration
        const navEnd = new NavigationEnd(2, '/b', '/b');
        routerEvents.next(new Scroll(navEnd, [0, 200], null));

        setTimeout(() => {
            expect(service.getDiagnostics().y).toBe(1);
            done();
        }, 500);
    }, 500);
  });

  it('should abort restoration if a new navigation occurs', () => {
    const navEnd1 = new NavigationEnd(2, '/page1', '/page1');
    const scrollEvent1 = new Scroll(navEnd1, [0, 100], null);

    const navEnd2 = new NavigationEnd(3, '/page2', '/page2');
    const scrollEvent2 = new Scroll(navEnd2, [0, 200], null);

    routerEvents.next(scrollEvent1);
    routerEvents.next(scrollEvent2);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(200, jasmine.any(Object));
        expect(scrollEngineMock.scrollTo).not.toHaveBeenCalledWith(100, jasmine.any(Object));
        resolve();
      }, 500);
    });
  });

  it('should not initialize or capture state on non-browser platforms', () => {
    const ssrRouterMock = {
      events: new Subject().asObservable(),
      url: '/list'
    };
    const ssrService = new ScrollRestorationService(ssrRouterMock as any, scrollEngineMock, 'server' as any, documentMock);

    expect(ssrService).toBeTruthy();

    if (!(sessionStorage.setItem as any).calls) {
        spyOn(sessionStorage, 'setItem');
    }

    (ssrService as any).captureScrollState('/test');
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
    ssrService.ngOnDestroy();
  });
});
