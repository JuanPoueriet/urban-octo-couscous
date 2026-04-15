import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { Seo } from './seo';
import { RouterModule } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';

describe('Seo', () => {
  let service: Seo;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslateModule.forRoot(),
        RouterModule.forRoot([])
      ],
      providers: [
        Seo,
        provideZonelessChangeDetection()
      ]
    });
    service = TestBed.inject(Seo);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
