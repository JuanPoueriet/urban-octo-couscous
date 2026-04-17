import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { BlogPost, Solution } from '@core/services/data.service';

@Component({
  selector: 'app-related-content',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule],
  templateUrl: './related-content.html',
  styleUrls: ['./related-content.scss']
})
export class RelatedContentComponent {
  @Input() items: (BlogPost | Solution)[] = [];
  @Input() type: 'blog' | 'solution' = 'blog';
  @Input() title = 'RELATED.TITLE';

  getItemLink(item: any): string[] {
    if (this.type === 'blog') {
      return ['/blog', item.slug];
    } else {
      return ['/solutions', item.slug];
    }
  }

  getItemImage(item: any): string {
    return item.heroImage || item.imageUrl || '';
  }

  getItemTitle(item: any): string {
    return this.type === 'blog' ? (item as BlogPost).key + '.TITLE' : (item as Solution).sections[0].titleKey;
  }
}
