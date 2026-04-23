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
  init: jasmine.createSpy('init'),
};

describe('App', () => {
  beforeEach(async () => {
    mockSeoService.init.calls.reset();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTranslateService(),
        { provide: Seo, useValue: mockSeoService }
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
    expect(mockSeoService.init).toHaveBeenCalled();
  });
});

// ─── Swipe Blocker: direction-aware edge detection ────────────────────────────

describe('App.detectEdge', () => {
  const THRESHOLD = 24;
  const SCREEN = 375;

  describe('LTR mode', () => {
    it('detects left edge when clientX is within threshold', () => {
      expect(App.detectEdge(0, SCREEN, THRESHOLD, false)).toBeTrue();
      expect(App.detectEdge(24, SCREEN, THRESHOLD, false)).toBeTrue();
    });

    it('does NOT detect edge when clientX exceeds threshold', () => {
      expect(App.detectEdge(25, SCREEN, THRESHOLD, false)).toBeFalse();
      expect(App.detectEdge(100, SCREEN, THRESHOLD, false)).toBeFalse();
    });

    it('does NOT detect right edge in LTR', () => {
      expect(App.detectEdge(SCREEN - 5, SCREEN, THRESHOLD, false)).toBeFalse();
    });
  });

  describe('RTL mode', () => {
    it('detects right edge when clientX is within threshold from right', () => {
      expect(App.detectEdge(SCREEN, SCREEN, THRESHOLD, true)).toBeTrue();       // 375 >= 375-24=351
      expect(App.detectEdge(SCREEN - THRESHOLD, SCREEN, THRESHOLD, true)).toBeTrue(); // 351 >= 351
    });

    it('does NOT detect edge when clientX is left of the RTL threshold', () => {
      expect(App.detectEdge(SCREEN - THRESHOLD - 1, SCREEN, THRESHOLD, true)).toBeFalse(); // 350 < 351
      expect(App.detectEdge(0, SCREEN, THRESHOLD, true)).toBeFalse();
    });

    it('does NOT detect left edge in RTL', () => {
      expect(App.detectEdge(10, SCREEN, THRESHOLD, true)).toBeFalse();
    });
  });
});

// ─── Swipe Blocker: direction-aware gesture blocking ─────────────────────────

describe('App.shouldBlockGesture', () => {
  const MIN_MOVE = 10;

  describe('LTR mode — blocks rightward swipe', () => {
    it('blocks when rightward dx exceeds minHorizontalMove and horizontal dominates', () => {
      expect(App.shouldBlockGesture(50, 5, MIN_MOVE, false)).toBeTrue();
      expect(App.shouldBlockGesture(11, 5, MIN_MOVE, false)).toBeTrue();
    });

    it('does NOT block when rightward dx equals or is below threshold', () => {
      expect(App.shouldBlockGesture(10, 5, MIN_MOVE, false)).toBeFalse(); // 10 > 10 is false
      expect(App.shouldBlockGesture(5, 2, MIN_MOVE, false)).toBeFalse();
    });

    it('does NOT block leftward swipe in LTR', () => {
      expect(App.shouldBlockGesture(-50, 5, MIN_MOVE, false)).toBeFalse();
    });

    it('does NOT block when vertical movement dominates', () => {
      expect(App.shouldBlockGesture(50, 100, MIN_MOVE, false)).toBeFalse();
      expect(App.shouldBlockGesture(50, 51, MIN_MOVE, false)).toBeFalse();
    });

    it('blocks when horizontal exactly equals vertical (tie goes to horizontal? — no, > not >=)', () => {
      expect(App.shouldBlockGesture(50, 50, MIN_MOVE, false)).toBeFalse();
    });
  });

  describe('RTL mode — blocks leftward swipe', () => {
    it('blocks when leftward dx exceeds minHorizontalMove and horizontal dominates', () => {
      expect(App.shouldBlockGesture(-50, 5, MIN_MOVE, true)).toBeTrue();
      expect(App.shouldBlockGesture(-11, 5, MIN_MOVE, true)).toBeTrue();
    });

    it('does NOT block when leftward dx equals or is below threshold', () => {
      expect(App.shouldBlockGesture(-10, 5, MIN_MOVE, true)).toBeFalse(); // -10 < -10 is false
      expect(App.shouldBlockGesture(-5, 2, MIN_MOVE, true)).toBeFalse();
    });

    it('does NOT block rightward swipe in RTL', () => {
      expect(App.shouldBlockGesture(50, 5, MIN_MOVE, true)).toBeFalse();
    });

    it('does NOT block when vertical movement dominates', () => {
      expect(App.shouldBlockGesture(-50, -100, MIN_MOVE, true)).toBeFalse();
      expect(App.shouldBlockGesture(-50, 100, MIN_MOVE, true)).toBeFalse();
    });
  });

  describe('cross-direction symmetry', () => {
    it('LTR and RTL block opposite gestures symmetrically', () => {
      const dx = 40; const dy = 10;
      expect(App.shouldBlockGesture(dx, dy, MIN_MOVE, false)).toBeTrue();   // rightward blocked in LTR
      expect(App.shouldBlockGesture(dx, dy, MIN_MOVE, true)).toBeFalse();   // rightward allowed in RTL
      expect(App.shouldBlockGesture(-dx, dy, MIN_MOVE, true)).toBeTrue();   // leftward blocked in RTL
      expect(App.shouldBlockGesture(-dx, dy, MIN_MOVE, false)).toBeFalse(); // leftward allowed in LTR
    });
  });
});