import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DocumentService } from '../../services/document.service';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './upload.html'
})
export class UploadComponent {
  selectedFile: File | null = null;
  dragging = false;

  title = '';
  oneTime = false;

  expiryMode: 'none' | 'hours' | 'datetime' = 'none';
  expiryHours: number | null = 24;
  expiryDateTimeLocal = '';

  loading = false;
  error: string | null = null;
  upgradeRequired = false;
  uploadedLinkUrl: string | null = null;

  constructor(
    private documentService: DocumentService,
    private router: Router
  ) {}

  onFilePicked(files: FileList | null) {
    if (!files || files.length === 0) return;
    this.selectedFile = files[0];
    this.error = null;
    this.upgradeRequired = false;
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragging = false;
    const files = ev.dataTransfer?.files;
    if (files && files.length > 0) {
      this.onFilePicked(files);
    }
  }

  onDragOver(ev: DragEvent) {
    ev.preventDefault();
    this.dragging = true;
  }

  onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    this.dragging = false;
  }

  clearFile() {
    this.selectedFile = null;
  }

  private computeExpiresAtIso(): string | null {
    if (this.expiryMode === 'none') return null;

    if (this.expiryMode === 'hours') {
      const hours = this.expiryHours ?? 0;
      if (!Number.isFinite(hours) || hours <= 0) return null;
      const d = new Date(Date.now() + hours * 60 * 60 * 1000);
      return d.toISOString();
    }

    // datetime-local is in local time without timezone; convert to Date.
    if (!this.expiryDateTimeLocal) return null;
    const d = new Date(this.expiryDateTimeLocal);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  submit() {
    this.error = null;
    this.upgradeRequired = false;
    this.uploadedLinkUrl = null;

    if (!this.selectedFile) {
      this.error = 'Please choose a file to upload.';
      return;
    }

    this.loading = true;
    const form = new FormData();
    form.append('file', this.selectedFile);
    if (this.title.trim()) form.append('title', this.title.trim());

    const expiresAt = this.computeExpiresAtIso();
    if (expiresAt) form.append('expiresAt', expiresAt);

    if (this.oneTime) {
      form.append('maxViews', '1');
    }

    this.documentService.uploadDocument(form).subscribe({
      next: (resp) => {
        this.loading = false;
        this.uploadedLinkUrl = resp?.linkUrl ?? null;
        // If no linkUrl returned, still go back to dashboard.
        if (!this.uploadedLinkUrl) {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: (err: unknown) => {
        this.loading = false;
        if (err instanceof HttpErrorResponse) {
          if (err.status === 403) {
            this.upgradeRequired = true;
            this.error = null;
            return;
          }
          this.error = err.error?.error || err.error?.message || `Upload failed (${err.status}).`;
        } else {
          this.error = 'Upload failed.';
        }
      }
    });
  }

  backToDashboard() {
    this.router.navigateByUrl('/dashboard');
  }
}
