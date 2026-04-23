import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-thank-you',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, LucideAngularModule],
  templateUrl: './thank-you.html',
  styleUrls: ['./thank-you.scss']
})
export class ThankYou {

}
