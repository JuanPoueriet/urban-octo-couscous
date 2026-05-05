import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopBar } from './top-bar';

describe('TopBar', () => {
  let component: TopBar;
  let fixture: ComponentFixture<TopBar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
      imports: [TopBar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
