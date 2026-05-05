import { MobileMenuGestures, MobileMenuGestureConfig } from './mobile-menu-gestures';
import { NgZone } from '@angular/core';

describe('MobileMenuElastic', () => {
  let gestures: MobileMenuGestures;
  let mockConfig: MobileMenuGestureConfig;
  let mockNgZone: jasmine.SpyObj<NgZone>;

  beforeEach(() => {
    mockConfig = {
      menuWidth: 320,
      elasticResistance: 50,
      isRtl: () => false,
      isOpen: () => true,
      isAnimating: () => false,
      getCurrentTranslateX: () => 0,
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
    const pointerDownEvent = {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      stopPropagation: () => {},
    } as any;

    gestures.onMenuPointerDown(pointerDownEvent);

    const pointerMoveEvent = {
      pointerId: 1,
      clientX: 150, // Move 50px right
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;

    gestures.onMenuPointerMove(pointerMoveEvent);

    // diffX = 150 - 100 = 50. In LTR, max = 0.
    // Overshoot = 50.
    // menuWidth=320 => referenceOvershoot=80.
    // normalized=50/80=0.625
    // elasticResistance=50 => exponent=3
    // damped=1-(1-0.625)^3=0.9473
    // maxStretchPercent=4 => maxScale=1.04
    // scaleX=1 + 0.9473*(0.04)=1.038
    const args = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toBe(0);
    expect(args[2]).toBeCloseTo(1.038, 2);
    expect(args[3]).toBe('left');
  });

  it('should calculate scaleX > 1 when overshooting left in LTR (closing more)', () => {
    // LTR: closing more is translateX < -menuWidth
    const pointerDownEvent = {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      stopPropagation: () => {},
    } as any;

    gestures.onMenuPointerDown(pointerDownEvent);

    const pointerMoveEvent = {
      pointerId: 1,
      clientX: 20, // Move 80px left
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;

    gestures.onMenuPointerMove(pointerMoveEvent);

    // diffX = 20 - 100 = -80. In LTR, min = -320.
    // Wait, the starting position of the gesture matters.
    // For onMenuPointerMove (dragging an already open menu), diffX IS the translateX.
    // If diffX = -80, it's not overshooting -320.

    // Let's simulate overshooting -320
    const pointerMoveOvershoot = {
      pointerId: 1,
      clientX: -300, // Move 400px left
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;
    gestures.onMenuPointerMove(pointerMoveOvershoot);

    // diffX = -300 - 100 = -400. In LTR, min = -320.
    // Overshoot = -320 - (-400) = 80.
    // overshoot=80 reaches the reference => normalized=1 => scaleX=maxScale=1.04
    const args = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toBe(-320);
    expect(args[2]).toBeCloseTo(1.04, 2);
    expect(args[3]).toBe('right');
  });

  it('should handle RTL overshooting (opening more)', () => {
    mockConfig.isRtl = () => true;

    // RTL: opening more is translateX < 0 (menu comes from right, 0 is fully open)
    const pointerDownEvent = {
      pointerId: 1,
      clientX: 300,
      clientY: 100,
      stopPropagation: () => {},
    } as any;

    gestures.onMenuPointerDown(pointerDownEvent);

    const pointerMoveEvent = {
      pointerId: 1,
      clientX: 250, // Move 50px left
      clientY: 100,
      preventDefault: () => {},
      stopPropagation: () => {},
    } as any;

    gestures.onMenuPointerMove(pointerMoveEvent);

    // diffX = 250 - 300 = -50. In RTL, min = 0.
    // Overshoot = 0 - (-50) = 50.
    // scaleX = 1.038 (same damping with overshoot=50)
    const args = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent().args;
    expect(args[0]).toBe(0);
    expect(args[2]).toBeCloseTo(1.038, 2);
    expect(args[3]).toBe('right');
  });

  it('should open with edge swipe in LTR', () => {
    mockConfig.isOpen = () => false;
    gestures.setEdgeSwipeEnabled(true);
    const pointerId = 1;
    gestures.handleWindowPointerDown({ pointerId, clientX: 5, clientY: 20 } as any);

    // Initial move to trigger horizontal gesture
    (gestures as any).handleEdgeSwipeMove({
      pointerId,
      clientX: 20,
      clientY: 20,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);

    (gestures as any).handleEdgeSwipeMove({
      pointerId,
      clientX: 120,
      clientY: 25,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);
    (gestures as any).handleEdgeSwipeEnd({ pointerId } as any);

    expect(mockConfig.onOpen).toHaveBeenCalled();
    expect(mockConfig.onUpdateTranslate).toHaveBeenCalled();
  });

  it('should cancel edge swipe on vertical gesture', () => {
    mockConfig.isOpen = () => false;
    gestures.setEdgeSwipeEnabled(true);
    const pointerId = 1;
    gestures.handleWindowPointerDown({ pointerId, clientX: 5, clientY: 20 } as any);
    (gestures as any).handleEdgeSwipeMove({
      pointerId,
      clientX: 8,
      clientY: 80,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);

    expect(gestures.getIsDragging()).toBeFalse();
    const call = (mockConfig.onUpdateTranslate as jasmine.Spy).calls.mostRecent();
    expect(call).toBeDefined();
    expect(call.args[0]).toBe(-320);
    expect(call.args[1]).toBeNull();
  });

  it('should open with edge swipe in RTL', () => {
    mockConfig.isRtl = () => true;
    mockConfig.isOpen = () => false;
    gestures.setEdgeSwipeEnabled(true);
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(400);

    const pointerId = 1;
    gestures.handleWindowPointerDown({ pointerId, clientX: 395, clientY: 40 } as any);

    // Initial move to trigger horizontal gesture
    (gestures as any).handleEdgeSwipeMove({
      pointerId,
      clientX: 380,
      clientY: 40,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);

    (gestures as any).handleEdgeSwipeMove({
      pointerId,
      clientX: 260,
      clientY: 44,
      preventDefault: () => {},
      stopPropagation: () => {}
    } as any);
    (gestures as any).handleEdgeSwipeEnd({ pointerId } as any);

    expect(mockConfig.onOpen).toHaveBeenCalled();
  });
});
