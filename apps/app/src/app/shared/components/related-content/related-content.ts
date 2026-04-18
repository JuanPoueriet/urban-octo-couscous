import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BlogPost, Solution, Product } from '@core/services/data.service';

@Component({
  selector: 'jsl-related-content',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './related-content.html',
  styleUrls: ['./related-content.scss']
})
export class RelatedContentComponent {
  @Input() items: (BlogPost | Solution | Product)[] = [];
  @Input() type: 'blog' | 'solution' | 'product' = 'blog';
  @Input() title = 'RELATED.TITLE';
  @Input() currentLang = 'en';

  getItemLink(item: any): any[] {
    if (this.type === 'blog') {
      return ['/', this.currentLang, 'blog', item.slug];
    } else if (this.type === 'product') {
      return ['/', this.currentLang, 'products', item.slug];
    } else {
      return ['/', this.currentLang, 'solutions', item.slug];
    }
  }

  getItemImage(item: any): string {
    return item.heroImage || item.imageUrl || (this.type === 'product' ? 'assets/imgs/jsl-social-default.jpg' : '');
  }

  getItemTitle(item: any): string {
    if (this.type === 'blog') {
      return 'BLOG.' + (item as BlogPost).key + '_TITLE';
    } else if (this.type === 'product') {
      return 'PRODUCTS.' + (item as Product).key + '_TITLE';
    } else {
      return 'SOLUTIONS.' + (item as Solution).key + '_TITLE';
    }
  }
}
