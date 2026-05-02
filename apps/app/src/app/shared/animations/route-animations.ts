import {
  trigger,
  transition,
  style,
  query,
  animate,
  group,
} from '@angular/animations';

/**
 * Route transition animation for smooth page changes.
 * Implements a cross-fade effect (fade-in and fade-out).
 *
 * @usage
 * Apply [@routeAnimations] to the wrapper element of <router-outlet>.
 */
export const routeTransition = trigger('routeAnimations', [
  transition('* <=> *', [
    // Ensure the container is relative so children can be absolute
    style({ position: 'relative' }),
    // Both components overlap during the transition
    query(
      ':enter, :leave',
      [
        style({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
        }),
      ],
      { optional: true },
    ),
    // Initial state for the entering component
    query(':enter', [style({ opacity: 0 })], { optional: true }),
    // Run both animations in parallel for a cross-fade effect
    group([
      query(
        ':leave',
        [animate('400ms ease-out', style({ opacity: 0 }))],
        { optional: true },
      ),
      query(
        ':enter',
        [animate('800ms ease-in', style({ opacity: 1 }))],
        { optional: true },
      ),
    ]),
  ]),
]);
