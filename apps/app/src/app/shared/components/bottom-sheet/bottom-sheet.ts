import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  HostListener,
  Inject,
  PLATFORM_ID,
  Renderer2,
  ElementRef,
  ViewChild,
  OnInit,
  ChangeDetectorRef,
  NgZone,
  inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import { GestureBusService } from '@core/services/gesture-bus.service';
import { BottomSheetGestures } from './bottom-sheet-gestures';

@Component({
  selector: 'jsl-bottom-sheet',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.scss',
})
export class BottomSheetComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() showCloseButton = true;
  @Output() close = new EventEmitter<void>();

  @ViewChild('sheetContainer') sheetContainer?: ElementRef<HTMLElement>;
  @ViewChild('sheetContent') sheetContent?: ElementRef<HTMLElement>;
  @ViewChild('backdropElement') backdropElement?: ElementRef<HTMLElement>;

  protected isDragging = false;
  private originalParent: Node | null = null;
  private originalNextSibling: Node | null = null;
  private isAppendedToBody = false;

  public translateY = 100; // % by default (closed)
  public overlayOpacity = 0;
  public transitionStyle = 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease';

  private gestures?: BottomSheetGestures;
  private gestureBus = inject(GestureBusService);
  private ngZone = inject(NgZone);
  private cdRef = inject(ChangeDetectorRef);

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2,
    private hostElementRef: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    const isBrowser = isPlatformBrowser(this.platformId);

    if (isBrowser) {
      const host = this.hostElementRef.nativeElement;
      this.originalParent = host.parentNode;
      this.originalNextSibling = host.nextSibling;
      this.setupGestures();
    }
  }

  private setupGestures(): void {
    this.gestures = new BottomSheetGestures(
      {
        isOpen: () => this.isOpen,
        isAtTop: () => !this.sheetContent || this.sheetContent.nativeElement.scrollTop <= 0,
        onUpdateTranslate: (y, progress) => {
          const isDragging = progress !== null;

          if (isDragging) {
            // High-frequency updates outside Angular zone for performance
            if (this.sheetContainer) {
              this.renderer.setStyle(this.sheetContainer.nativeElement, 'transform', `translateY(${y}px)`);
              this.renderer.setStyle(this.sheetContainer.nativeElement, 'transition', 'none');
            }
            if (this.backdropElement) {
              this.renderer.setStyle(this.backdropElement.nativeElement, 'opacity', (progress ?? 1).toString());
              this.renderer.setStyle(this.backdropElement.nativeElement, 'transition', 'none');
            }
          } else {
            // Reset to reactive state
            this.ngZone.run(() => {
              this.translateY = y;
              this.isDragging = false;
              this.overlayOpacity = this.isOpen ? 1 : 0;
              this.transitionStyle = this.isOpen
                ? 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease'
                : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 250ms ease';

              // Clear manual styles
              if (this.sheetContainer) {
                this.renderer.removeStyle(this.sheetContainer.nativeElement, 'transform');
                this.renderer.removeStyle(this.sheetContainer.nativeElement, 'transition');
              }
              if (this.backdropElement) {
                this.renderer.removeStyle(this.backdropElement.nativeElement, 'opacity');
                this.renderer.removeStyle(this.backdropElement.nativeElement, 'transition');
              }

              this.cdRef.markForCheck();
            });
          }
        },
        onOpen: () => {
          this.ngZone.run(() => {
            this.updateState(true);
          });
        },
        onClose: () => {
          this.ngZone.run(() => {
            this.onClose();
          });
        },
        onStopTransition: () => {
          this.ngZone.run(() => {
            this.transitionStyle = 'none';
            this.cdRef.markForCheck();
          });
        }
      },
      this.ngZone,
      this.gestureBus
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (isPlatformBrowser(this.platformId) && changes['isOpen']) {
      const isOpen = changes['isOpen'].currentValue;
      this.updateState(isOpen);
    }
  }

  private updateState(isOpen: boolean): void {
    this.toggleBodyScroll(isOpen);
    this.syncHostMountPoint(isOpen);

    this.transitionStyle = isOpen
      ? 'transform 400ms cubic-bezier(0.32, 0.72, 0, 1), opacity 300ms ease'
      : 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1), opacity 250ms ease';

    this.translateY = isOpen ? 0 : 100;
    this.overlayOpacity = isOpen ? 1 : 0;

    this.cdRef.markForCheck();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.toggleBodyScroll(false);
      this.syncHostMountPoint(false);
      this.gestures?.destroy();
    }
  }

  private syncHostMountPoint(isOpen: boolean): void {
    const host = this.hostElementRef.nativeElement;

    if (isOpen && !this.isAppendedToBody) {
      this.renderer.appendChild(this.document.body, host);
      this.isAppendedToBody = true;
      return;
    }

    if (!isOpen && this.isAppendedToBody && this.originalParent) {
      if (this.originalNextSibling?.parentNode === this.originalParent) {
        this.renderer.insertBefore(this.originalParent, host, this.originalNextSibling);
      } else {
        this.renderer.appendChild(this.originalParent, host);
      }
      this.isAppendedToBody = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  private toggleBodyScroll(lock: boolean): void {
    const body = this.document.body;
    if (lock) {
      this.renderer.setStyle(body, 'overflow', 'hidden');
      this.renderer.setStyle(body, 'touch-action', 'none');
    } else {
      this.renderer.removeStyle(body, 'overflow');
      this.renderer.removeStyle(body, 'touch-action');
    }
  }
}
