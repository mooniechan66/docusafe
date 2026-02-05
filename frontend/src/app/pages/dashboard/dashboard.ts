import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import { Document, DocumentService } from '../../services/document.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule, DatePipe],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent {
  private readonly documentService = inject(DocumentService);
  private readonly authService = inject(AuthService);

  readonly documents = signal<ReadonlyArray<Document>>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.error.set(null);

    this.documentService
      .getDocuments()
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (docs) => this.documents.set(docs),
        error: () => this.error.set('Failed to load documents.')
      });
  }

  burnDocument(id: string) {
    const ok = window.confirm(
      'Are you sure you want to burn this document? It will become inaccessible.'
    );
    if (!ok) return;

    this.loading.set(true);
    this.error.set(null);

    this.documentService
      .deleteDocument(id)
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => this.refresh(),
        error: () => this.error.set('Failed to burn document.')
      });
  }

  logout() {
    this.authService.logout();
  }
}
