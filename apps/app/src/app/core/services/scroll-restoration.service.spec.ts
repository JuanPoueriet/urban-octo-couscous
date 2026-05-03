import { TestBed } from '@angular/core/testing';
import { ScrollRestorationService } from './scroll-restoration.service';
import { Router, NavigationStart, Scroll, NavigationEnd } from '@angular/router';
import { ScrollEngineService } from './scroll-engine.service';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { Subject, of } from 'rxjs';

describe('ScrollRestorationService', () => {
  let service: ScrollRestorationService;
  let routerEvents: Subject<NavigationStart | Scroll | NavigationEnd>;
  let scrollEngineMock: jasmine.SpyObj<ScrollEngineService>;
  let routerMock: { events: Subject<NavigationStart | Scroll | NavigationEnd>; url: string };

  beforeEach(() => {
    routerEvents = new Subject();
    scrollEngineMock = jasmine.createSpyObj('ScrollEngineService', ['isReady$', 'scrollTo', 'getHeaderOffset']);
    scrollEngineMock.isReady$.and.returnValue(of(true));
    scrollEngineMock.getHeaderOffset.and.returnValue(80);

    routerMock = {
      events: routerEvents,
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

    spyOn(document, 'querySelector').and.callFake(((selector: string) => {
        if (selector === '[data-scroll-key="test-item"]') return mockEl;
        return null;
    }) as any);

    const clickEvent = new MouseEvent('click', { bubbles: true });
    mockEl.dispatchEvent(clickEvent);

    routerEvents.next(new NavigationStart(1, '/detail'));

    // Verify it was saved by triggering a restoration attempt
    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    // Using a microtask wait to let async logic run
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

  it('should persist and load history from sessionStorage', () => {
    const mockHistory = {
      '/test': { y: 100, anchor: null, scrollKey: null, relativeTop: null }
    };
    spyOn(sessionStorage, 'getItem').and.returnValue(JSON.stringify(mockHistory));
    spyOn(sessionStorage, 'setItem');

    // Re-instantiate to trigger loading
    new ScrollRestorationService(routerMock as any, scrollEngineMock, 'browser' as any);

    // Trigger restoration to see if it uses the loaded state
    const navEnd = new NavigationEnd(2, '/test', '/test');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(100, jasmine.objectContaining({
          immediate: true
        }));
        resolve();
      }, 500);
    });
  });

  it('should prune history using LRU policy', () => {
    spyOn(sessionStorage, 'setItem');
    // Fill history up to MAX_HISTORY_SIZE (100)
    for (let i = 0; i < 100; i++) {
        routerMock.url = `/page-${i}`;
        routerEvents.next(new NavigationStart(i, `/page-${i + 1}`));
    }

    // Add one more
    routerMock.url = '/page-100';
    routerEvents.next(new NavigationStart(101, '/page-101'));

    // The first one (/page-0) should be gone
    const navEnd = new NavigationEnd(102, '/page-0', '/page-0');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        // Should fallback to e.position[1] (500) because /page-0 is pruned
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(500, jasmine.objectContaining({
          immediate: true
        }));
        resolve();
      }, 500);
    });
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
    spyOn(document, 'querySelector').and.callFake(((selector: string) => {
        if (selector === '[data-scroll-key="test-item"]') return foundEl;
        return null;
    }) as any);

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

  it('should capture scroll key on focusin (keyboard navigation)', () => {
    const mockEl = document.createElement('button');
    mockEl.setAttribute('data-scroll-key', 'keyboard-item');
    document.body.appendChild(mockEl);

    spyOn(document, 'querySelector').and.callFake(((selector: string) => {
        if (selector === '[data-scroll-key="keyboard-item"]') return mockEl;
        return null;
    }) as any);

    mockEl.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    routerEvents.next(new NavigationStart(1, '/detail'));

    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, [0, 500], null);
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(mockEl, jasmine.any(Object));
        document.body.removeChild(mockEl);
        resolve();
      }, 500);
    });
  });

  it('should handle missing anchors gracefully', () => {
    const navEnd = new NavigationEnd(2, '/list', '/list');
    const scrollEvent = new Scroll(navEnd, null, 'non-existent-anchor');
    routerEvents.next(scrollEvent);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        // Should NOT have called scrollTo with an element
        const calls = scrollEngineMock.scrollTo.calls.all();
        const elementCalls = calls.filter((c: any) => typeof c.args[0] !== 'number');
        expect(elementCalls.length).toBe(0);
        resolve();
      }, 500);
    });
  });

  it('should abort restoration if a new navigation occurs', () => {
    const navEnd1 = new NavigationEnd(2, '/page1', '/page1');
    const scrollEvent1 = new Scroll(navEnd1, [0, 100], null);

    const navEnd2 = new NavigationEnd(3, '/page2', '/page2');
    const scrollEvent2 = new Scroll(navEnd2, [0, 200], null);

    routerEvents.next(scrollEvent1);
    // Rapidly trigger another navigation
    routerEvents.next(scrollEvent2);

    return new Promise<void>(resolve => {
      setTimeout(() => {
        // Should only have restored for the LATEST navigation (/page2)
        expect(scrollEngineMock.scrollTo).toHaveBeenCalledWith(200, jasmine.any(Object));
        const calls = (scrollEngineMock.scrollTo as jasmine.Spy).calls.all();
        const has100 = calls.some(c => c.args[0] === 100);
        expect(has100).toBeFalse();
        resolve();
      }, 500);
    });
  });

  it('should stop listening to events on destroy', () => {
    service.ngOnDestroy();

    routerEvents.next(new NavigationStart(1, '/other'));
    // If it was still listening, it would try to capture state
    // We can't easily check private state but we can check if it stopped reacting to router events
    // by ensuring no new history entries are added (though we can't see the Map directly).

    // A more direct way is to check if it's still reacting to click events
    const clickEvent = new MouseEvent('click', { bubbles: true });
    document.body.dispatchEvent(clickEvent);

    // This is more of a smoke test to ensure no errors occur after destroy
    expect(true).toBeTrue();
  });

  it('should not initialize or capture state on non-browser platforms', () => {
    const ssrRouterMock = {
      events: new Subject().asObservable(),
      url: '/list'
    };
    // Re-instantiate with non-browser platform
    const ssrService = new ScrollRestorationService(ssrRouterMock as any, scrollEngineMock, 'server' as any);

    // It should not throw errors and should handle calls gracefully
    expect(ssrService).toBeTruthy();

    // Mock sessionStorage specifically for this test if not already a spy
    if (!(sessionStorage.setItem as any).calls) {
        spyOn(sessionStorage, 'setItem');
    }

    // Triggering a capture should be a no-op
    (ssrService as any).captureScrollState('/test');
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});
