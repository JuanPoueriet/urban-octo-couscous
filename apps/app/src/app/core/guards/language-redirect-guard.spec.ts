import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { languageRedirectGuard } from './language-redirect-guard';

describe('languageRedirectGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => languageRedirectGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
