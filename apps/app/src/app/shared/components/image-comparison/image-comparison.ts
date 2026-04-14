import { Component, Input, ViewChild, ElementRef, HostListener, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'jsl-image-comparison',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './image-comparison.html',
  styleUrls: ['./image-comparison.scss']
})
export class ImageComparisonComponent implements AfterViewInit {
  @Input() beforeImage: string = '';
  @Input() afterImage: string = '';
  @Input() beforeLabel: string = 'Before';
  @Input() afterLabel: string = 'After';
  @Input() alt: string = 'Image comparison';

  @ViewChild('container') containerRef!: ElementRef<HTMLElement>;

  public sliderPosition = 50;
  private isDragging = false;

  ngAfterViewInit() {
    // Initial setup if needed
  }

  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.handleMove(event.clientX);
  }

  @HostListener('window:mouseup')
  onMouseUp() {
    this.isDragging = false;
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      this.handleMove(event.clientX);
    }
  }

  onTouchStart(event: TouchEvent) {
    this.isDragging = true;
    this.handleMove(event.touches[0].clientX);
  }

  @HostListener('window:touchend')
  onTouchEnd() {
    this.isDragging = false;
  }

  @HostListener('window:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isDragging) {
      this.handleMove(event.touches[0].clientX);
    }
  }

  private handleMove(clientX: number) {
    if (!this.containerRef) return;

    const rect = this.containerRef.nativeElement.getBoundingClientRect();
    const x = clientX - rect.left;
    let position = (x / rect.width) * 100;

    // Clamp between 0 and 100
    position = Math.max(0, Math.min(100, position));

    this.sliderPosition = position;
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowLeft') {
      this.sliderPosition = Math.max(0, this.sliderPosition - 5);
    } else if (event.key === 'ArrowRight') {
      this.sliderPosition = Math.min(100, this.sliderPosition + 5);
    }
  }
}
