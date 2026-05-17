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
  ViewChild,
  ElementRef
} from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'jsl-bottom-sheet',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, TranslateModule],
  templateUrl: './bottom-sheet.html',
  styleUrl: './bottom-sheet.scss',
  animations: [
    trigger('backdropFade', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('sheetSlide', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('400ms cubic-bezier(0.32, 0.72, 0, 1)', style({ transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.32, 0.72, 0, 1)', style({ transform: 'translateY(100%)' }))
      ])
    ])
  ]
})
export class BottomSheetComponent implements OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() showCloseButton = true;
  @Output() close = new EventEmitter<void>();

  @ViewChild('sheetContainer') sheetContainer?: ElementRef<HTMLElement>;
  @ViewChild('sheetContent') sheetContent?: ElementRef<HTMLElement>;

  private startY = 0;
  private currentY = 0;
  protected isDragging = false;

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    @Inject(DOCUMENT) private document: Document,
    private renderer: Renderer2
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (isPlatformBrowser(this.platformId) && changes['isOpen']) {
      this.toggleBodyScroll(changes['isOpen'].currentValue);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.toggleBodyScroll(false);
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

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent): void {
    if (!this.isOpen) return;
    this.startY = event.touches[0].clientY;
    this.currentY = this.startY;
    this.isDragging = true;
  }

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging || !this.sheetContainer) return;

    this.currentY = event.touches[0].clientY;
    const deltaY = this.currentY - this.startY;

    // Only drag down if we are at the top of the content scroll
    const isAtTop = !this.sheetContent || this.sheetContent.nativeElement.scrollTop <= 0;

    if (deltaY > 0 && isAtTop) {
      // Apply transform directly to the container for immediate feedback
      this.renderer.setStyle(this.sheetContainer.nativeElement, 'transform', `translateY(${deltaY}px)`);
      this.renderer.setStyle(this.sheetContainer.nativeElement, 'transition', 'none');

      // Prevent content scrolling while dragging the sheet
      if (event.cancelable) {
        event.preventDefault();
      }
    } else {
      // Reset transform if we are scrolling up or content is not at top
      this.renderer.removeStyle(this.sheetContainer.nativeElement, 'transform');
    }
  }

  @HostListener('touchend')
  onTouchEnd(): void {
    if (!this.isDragging || !this.sheetContainer) return;
    this.isDragging = false;

    const deltaY = this.currentY - this.startY;

    // Reset styles
    this.renderer.removeStyle(this.sheetContainer.nativeElement, 'transform');
    this.renderer.removeStyle(this.sheetContainer.nativeElement, 'transition');

    // Close if dragged down far enough and was at top
    const isAtTop = !this.sheetContent || this.sheetContent.nativeElement.scrollTop <= 0;
    if (deltaY > 150 && isAtTop) {
      this.onClose();
    }
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
