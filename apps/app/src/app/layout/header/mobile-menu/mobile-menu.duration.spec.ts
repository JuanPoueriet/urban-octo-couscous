import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileMenu } from './mobile-menu';
import { MenuService } from '@core/services/menu.service';
import { DirectionService } from '@core/services/direction.service';
import { BreakpointService } from '@core/services/breakpoint.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import {
  LucideAngularModule, Search, X, Mail, Linkedin, Github, Twitter, Instagram, SearchX, ChevronDown,
  LayoutGrid, Monitor, Smartphone, Laptop, CloudCog, Building2, Package, Layers, CircleDollarSign,
  Info, Workflow, Cpu, Briefcase, Network, Heart, TrendingUp, Rocket, ShieldCheck, Lightbulb,
  Newspaper, CalendarDays, Radio, BookOpen, Map, HelpCircle, Code, ExternalLink, Headphones
} from 'lucide-angular';
import { RouterTestingModule } from '@angular/router/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MIN_DRAWER_DURATION_MS, MAX_DRAWER_DURATION_MS, DrawerState } from './mobile-menu.constants';

describe('MobileMenu Duration Propagation', () => {
  let component: MobileMenu;
  let fixture: ComponentFixture<MobileMenu>;
  let menuService: MenuService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MobileMenu,
        NoopAnimationsModule,
        TranslateModule.forRoot(),
        LucideAngularModule.pick({
          Search, X, Mail, Linkedin, Github, Twitter, Instagram, SearchX, ChevronDown,
          LayoutGrid, Monitor, Smartphone, Laptop, CloudCog, Building2, Package, Layers, CircleDollarSign,
          Info, Workflow, Cpu, Briefcase, Network, Heart, TrendingUp, Rocket, ShieldCheck, Lightbulb,
          Newspaper, CalendarDays, Radio, BookOpen, Map, HelpCircle, Code, ExternalLink, Headphones
        }),
        RouterTestingModule
      ],
      providers: [
        provideZonelessChangeDetection(),
        MenuService,
        { provide: DirectionService, useValue: { isRtl: () => false } },
        { provide: BreakpointService, useValue: { isMobile: () => true } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MobileMenu);
    component = fixture.componentInstance;
    menuService = TestBed.inject(MenuService);

    await fixture.whenStable();
  });

  it('should calculate correct duration based on velocity', () => {
    (component as any).menuTranslateX = 0;
    const duration = (component as any).calculateAdaptiveDuration(2, -400);
    expect(duration).toBe(200);

    const fastDuration = (component as any).calculateAdaptiveDuration(10, -400);
    expect(fastDuration).toBe(MIN_DRAWER_DURATION_MS);

    const slowDuration = (component as any).calculateAdaptiveDuration(0.1, -400);
    expect(slowDuration).toBe(MAX_DRAWER_DURATION_MS);

    const defaultDuration = (component as any).calculateAdaptiveDuration(undefined, -400);
    expect(defaultDuration).toBe(MAX_DRAWER_DURATION_MS);
  });

  it('should propagate velocity from gesture to animation through the effect', async () => {
    const transitionSpy = spyOn((component as any).transitionCoordinator, 'transitionTo').and.callThrough();
    const velocity = 5;
    (component as any).gestureConfig.onOpen(velocity);

    expect((component as any).lastGestureVelocity).toBe(velocity);
    expect(menuService.isMobileMenuOpen()).toBeTrue();

    await fixture.whenStable();

    const call = transitionSpy.calls.mostRecent();
    expect(call.args[0]).toBe(DrawerState.OPENING);
    expect((call.args[1] as any).duration).toBe(MIN_DRAWER_DURATION_MS);
    expect((component as any).lastGestureVelocity).toBeUndefined();
  });

  it('should use default duration for manual toggles (no velocity)', async () => {
    const transitionSpy = spyOn((component as any).transitionCoordinator, 'transitionTo').and.callThrough();
    menuService.open();
    await fixture.whenStable();

    const call = transitionSpy.calls.mostRecent();
    expect((call.args[1] as any).duration).toBe(MAX_DRAWER_DURATION_MS);
  });
});
