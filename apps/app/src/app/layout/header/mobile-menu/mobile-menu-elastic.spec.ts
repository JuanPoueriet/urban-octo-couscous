import { MobileMenuGestures, MobileMenuGestureConfig } from './mobile-menu-gestures';
import { NgZone } from '@angular/core';

describe('MobileMenuElastic', () => {
  let gestures: MobileMenuGestures;
  let mockConfig: MobileMenuGestureConfig;
  let mockNgZone: jasmine.SpyObj<NgZone>;

  beforeEach(() => {
    mockConfig = {
      menuWidth: 320,
      isRtl: () => false,
      isOpen: () => true,
      isAnimating: () => false,
      onUpdateTranslate: jasmine.createSpy('onUpdateTranslate'),
      onOpen: jasmine.createSpy('onOpen'),
      onClose: jasmine.createSpy('onClose'),
      onToggleHaptic: jasmine.createSpy('onToggleHaptic'),
    };

    mockNgZone = jasmine.createSpyObj('NgZone', ['runOutsideAngular', 'run']);
    mockNgZone.runOutsideAngular.and.callFake((fn: Function) => fn());
    mockNgZone.run.and.callFake((fn: Function) => fn());

    gestures = new MobileMenuGestures(mockConfig, mockNgZone);
  });

  it('should calculate scaleX > 1 when overshooting right in LTR (opening more)', () => {
    // LTR: opening more is translateX > 0
    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      stopPropagation: () => {},
    } as any;

    gestures.onMenuTouchStart(touchStartEvent);

    const touchMoveEvent = {
      touches: [{ clientX: 150, clientY: 100 }], // Move 50px right
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;

    gestures.onMenuTouchMove(touchMoveEvent);

    // diffX = 150 - 100 = 50. In LTR, max = 0.
    // Overshoot = 50.
    // menuWidth=320 => referenceOvershoot=80.
    // normalized=50/80=0.625
    // resistance exponent=2 and sqrt damping => effective damping=0.625
    // maxStretchPercent=8 => maxScale=1.08
    // scaleX=1 + 0.625*(0.08)=1.05
    const args = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toBe(0);
    expect(args[2]).toBeCloseTo(1.05, 2);
    expect(args[3]).toBe('left');
  });

  it('should calculate scaleX > 1 when overshooting left in LTR (closing more)', () => {
    // LTR: closing more is translateX < -menuWidth
    const touchStartEvent = {
      touches: [{ clientX: 100, clientY: 100 }],
      stopPropagation: () => {},
    } as any;

    gestures.onMenuTouchStart(touchStartEvent);

    const touchMoveEvent = {
      touches: [{ clientX: 20, clientY: 100 }], // Move 80px left
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;

    gestures.onMenuTouchMove(touchMoveEvent);

    // diffX = 20 - 100 = -80. In LTR, min = -320.
    // Wait, the starting position of the gesture matters.
    // For onMenuTouchMove (dragging an already open menu), diffX IS the translateX.
    // If diffX = -80, it's not overshooting -320.

    // Let's simulate overshooting -320
    const touchMoveOvershoot = {
      touches: [{ clientX: -300, clientY: 100 }], // Move 400px left
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;
    gestures.onMenuTouchMove(touchMoveOvershoot);

    // diffX = -300 - 100 = -400. In LTR, min = -320.
    // Overshoot = -320 - (-400) = 80.
    // overshoot=80 reaches the reference => normalized=1 => scaleX=maxScale=1.08
    const args = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toBe(-320);
    expect(args[2]).toBeCloseTo(1.08, 2);
    expect(args[3]).toBe('right');
  });

  it('should handle RTL overshooting (opening more)', () => {
    mockConfig.isRtl = () => true;

    // RTL: opening more is translateX < 0 (menu comes from right, 0 is fully open)
    const touchStartEvent = {
      touches: [{ clientX: 300, clientY: 100 }],
      stopPropagation: () => {},
    } as any;

    gestures.onMenuTouchStart(touchStartEvent);

    const touchMoveEvent = {
      touches: [{ clientX: 250, clientY: 100 }], // Move 50px left
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;

    gestures.onMenuTouchMove(touchMoveEvent);

    // diffX = 250 - 300 = -50. In RTL, min = 0.
    // Overshoot = 0 - (-50) = 50.
    // scaleX = 1.05 (same damping with overshoot=50)
    const args = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toBe(0);
    expect(args[2]).toBeCloseTo(1.05, 2);
    expect(args[3]).toBe('right');
  });

  it('should open with edge swipe in LTR', () => {
    gestures.handleWindowTouchStart({ touches: [{ clientX: 5, clientY: 20 }] } as any);
    (gestures as any).handleEdgeSwipeMove({
      touches: [{ clientX: 120, clientY: 25 }],
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);
    (gestures as any).handleEdgeSwipeEnd();

    expect(mockConfig.onOpen).toHaveBeenCalled();
    expect(mockConfig.onUpdateTranslate).toHaveBeenCalled();
  });

  it('should cancel edge swipe on vertical gesture', () => {
    gestures.handleWindowTouchStart({ touches: [{ clientX: 5, clientY: 20 }] } as any);
    (gestures as any).handleEdgeSwipeMove({
      touches: [{ clientX: 8, clientY: 80 }],
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);

    expect(gestures.getIsDragging()).toBeFalse();
    const args = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toBe(-320);
    expect(args[1]).toBeNull();
  });

  it('should open with edge swipe in RTL', () => {
    mockConfig.isRtl = () => true;
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(400);

    gestures.handleWindowTouchStart({ touches: [{ clientX: 395, clientY: 40 }] } as any);
    (gestures as any).handleEdgeSwipeMove({
      touches: [{ clientX: 260, clientY: 44 }],
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);
    (gestures as any).handleEdgeSwipeEnd();

    expect(mockConfig.onOpen).toHaveBeenCalled();
  });
});
