import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SafeUrlPipe } from '../../pipes/safe-url.pipe';

@Component({
  selector: 'jsl-booking-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SafeUrlPipe],
  template: `
    <div class="booking-modal-overlay" *ngIf="isOpen" (click)="onClose()">
      <div class="booking-modal-container" (click)="$event.stopPropagation()">
        <div class="booking-modal-header">
           <h3>Book a Meeting</h3>
           <button class="close-btn" (click)="onClose()" aria-label="Close">
             <lucide-icon name="X"></lucide-icon>
           </button>
        </div>
        <div class="booking-content">
          <!-- Placeholder for Calendly/Hubspot iframe -->
          <iframe
            [src]="bookingUrl | safeUrl"
            width="100%"
            height="100%"
            frameborder="0"
            title="Booking Calendar">
          </iframe>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .booking-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(5px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      animation: fadeIn 0.3s ease;
    }

    .booking-modal-container {
      width: 100%;
      max-width: 800px;
      height: 80vh;
      background: var(--bg-card, #fff);
      border-radius: 12px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid var(--border-color, #e5e7eb);
    }

    .booking-modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border-color, #e5e7eb);
      display: flex;
      align-items: center;
      justify-content: space-between;

      h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--text-primary, #111);
      }
    }

    .close-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      color: var(--text-secondary, #666);
      border-radius: 50%;
      transition: background 0.2s;

      &:hover {
        background: var(--bg-secondary, #f3f4f6);
        color: var(--text-primary, #111);
      }
    }

    .booking-content {
      flex: 1;
      overflow: hidden;

      iframe {
        width: 100%;
        height: 100%;
        display: block;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `]
})
export class BookingModal {
  @Input() isOpen = false;
  @Input() bookingUrl = 'https://calendly.com'; // Default or placeholder
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event) {
    if (this.isOpen) {
      this.onClose();
    }
  }

  onClose() {
    this.close.emit();
  }
}
