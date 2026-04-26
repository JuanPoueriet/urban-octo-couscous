import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { FormsModule } from '@angular/forms';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'jsl-whitepaper-download',
  standalone: true,
  imports: [CommonModule, TranslateModule, LucideAngularModule, FormsModule],
  templateUrl: './whitepaper-download.html',
  styleUrl: './whitepaper-download.scss'
})
export class WhitepaperDownloadComponent {
  @Input() titleKey = 'WHITEPAPER.DEFAULT_TITLE';
  @Input() descriptionKey = 'WHITEPAPER.DEFAULT_DESC';
  @Input() pdfUrl = '#';

  email = '';
  isSubmitted = false;

  readonly coverLines = ['75%', '90%', '60%', '85%', '50%', '78%', '45%', '65%'];

  constructor(private toastService: ToastService, private translate: TranslateService) {}

  onSubmit() {
    if (this.email) {
      this.isSubmitted = true;
      this.toastService.show(
        this.translate.instant('WHITEPAPER.SUCCESS_MSG'),
        'success'
      );
      // Simulate download
      setTimeout(() => {
        window.open(this.pdfUrl, '_blank');
      }, 1000);
    }
  }
}
