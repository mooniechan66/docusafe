import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';

import { DocumentService } from '../../services/document.service';

type ExpiryMode = 'none' | 'hours' | 'datetime';

@Component({
  selector: 'app-upload',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './upload.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly documentService = inject(DocumentService);
  private readonly router = inject(Router);

  readonly selectedFile = signal<File | null>(null);
  readonly dragging = signal(false);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly upgradeRequired = signal(false);
  readonly uploadedLinkUrl = signal<string | null>(null);

  readonly form = this.fb.group({
    title: this.fb.control('', [Validators.maxLength(200)]),
    oneTime: this.fb.control(false),
    expiryMode: this.fb.control<ExpiryMode>('none'),
    expiryHours: this.fb.control<number>(24, [Validators.min(1), Validators.max(720)]),
    expiryDateTimeLocal: this.fb.control('')
  });

  readonly canSubmit = computed(() => !!this.selectedFile() && !this.loading());

  onFilePicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    this.selectedFile.set(files[0]);
    this.error.set(null);
    this.upgradeRequired.set(false);
    this.uploadedLinkUrl.set(null);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragging.set(false);
    const files = ev.dataTransfer?.files;
    if (files && files.length > 0) this.onFilePicked(files);
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.dragging.set(true);
  }

  onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.dragging.set(false);
  }

  clearFile() {
    this.selectedFile.set(null);
  }

  private computeExpiresAtIso(): string | null {
    const mode = this.form.controls.expiryMode.value;
    if (mode === 'none') return null;

    if (mode === 'hours') {
      const hours = this.form.controls.expiryHours.value;
      if (!Number.isFinite(hours) || hours <= 0) return null;
      return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }

    const local = this.form.controls.expiryDateTimeLocal.value;
    if (!local) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  submit() {
    this.error.set(null);
    this.upgradeRequired.set(false);
    this.uploadedLinkUrl.set(null);

    const file = this.selectedFile();
    if (!file) {
      this.error.set('Please choose a file to upload.');
      return;
    }

    this.loading.set(true);

    const body = new FormData();
    body.append('file', file);

    const title = this.form.controls.title.value.trim();
    if (title) body.append('title', title);

    const expiresAt = this.computeExpiresAtIso();
    if (expiresAt) body.append('expiresAt', expiresAt);

    if (this.form.controls.oneTime.value) {
      body.append('maxViews', '1');
    }

    this.documentService
      .uploadDocument(body)
      .pipe(
        timeout({ first: 60000 }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (resp) => {
          const linkUrl = typeof resp?.linkUrl === 'string' ? resp.linkUrl : null;
          this.uploadedLinkUrl.set(linkUrl);
          if (!linkUrl) {
            void this.router.navigateByUrl('/dashboard');
          }
        },
        error: (err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status === 403) {
              this.upgradeRequired.set(true);
              this.error.set(null);
              return;
            }
            const msg =
              (typeof err.error?.error === 'string' && err.error.error) ||
              (typeof err.error?.message === 'string' && err.error.message) ||
              `Upload failed (${err.status}).`;
            this.error.set(msg);
            return;
          }
          this.error.set('Upload failed.');
        }
      });
  }

  backToDashboard() {
    void this.router.navigateByUrl('/dashboard');
  }
}
