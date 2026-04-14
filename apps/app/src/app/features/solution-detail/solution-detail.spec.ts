import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SolutionDetail } from './solution-detail';

describe('SolutionDetail', () => {
  let component: SolutionDetail;
  let fixture: ComponentFixture<SolutionDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SolutionDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SolutionDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
