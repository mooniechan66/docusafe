import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewer.html'
})
export class ViewerComponent implements OnInit, OnDestroy {

  linkId = '';
  sessionId = '';

  loading = true;
  error: string | null = null;

  contentType: string | null = null;
  imageUrl: string | null = null;
  pdfUrl: SafeResourceUrl | null = null;

  private heartbeatTimer: any;
  private lastHeartbeatAt = Date.now();

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.linkId = this.route.snapshot.paramMap.get('linkId') || '';
    this.sessionId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

    this.fetchAndRender();

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('beforeunload', this.onBeforeUnload);

    this.sendFinalHeartbeat();

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.imageUrl) {
      URL.revokeObjectURL(this.imageUrl);
    }
  }

  private async fetchAndRender() {
    this.loading = true;
    this.error = null;

    const url = `/api/view/${encodeURIComponent(this.linkId)}?sid=${encodeURIComponent(this.sessionId)}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Failed to load document (${resp.status})`);
      }

      this.contentType = resp.headers.get('content-type');
      const blob = await resp.blob();

      this.loading = false;

      if ((this.contentType || '').includes('application/pdf')) {
        const objectUrl = URL.createObjectURL(blob);
        this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
      } else if ((this.contentType || '').startsWith('image/')) {
        this.imageUrl = URL.createObjectURL(blob);
      } else {
        this.imageUrl = URL.createObjectURL(blob);
      }

      this.cdr.detectChanges();
      this.startHeartbeats();
    } catch (err: any) {
      this.loading = false;
      this.error = err?.message || 'Failed to load document.';
      this.cdr.detectChanges();
    }
  }

  // (pdf.js/canvas rendering removed for now to keep dev server stable)

  private startHeartbeats() {
    this.lastHeartbeatAt = Date.now();

    // Every 5 seconds, send a delta
    this.heartbeatTimer = setInterval(() => {
      if (document.hidden) return;
      this.sendHeartbeatDelta();
    }, 5000);
  }

  private sendHeartbeatDelta() {
    const now = Date.now();
    const deltaSeconds = Math.max(0, Math.round((now - this.lastHeartbeatAt) / 1000));
    if (deltaSeconds === 0) return;

    this.lastHeartbeatAt = now;

    this.http
      .post(`/api/view/${encodeURIComponent(this.linkId)}/heartbeat`, {
        sessionId: this.sessionId,
        deltaSeconds
      })
      .subscribe({
        next: () => {},
        error: () => {
          // Ignore heartbeat errors (viewer should still work)
        }
      });
  }

  private sendFinalHeartbeat() {
    const now = Date.now();
    const deltaSeconds = Math.max(0, Math.round((now - this.lastHeartbeatAt) / 1000));
    if (!this.linkId || deltaSeconds === 0) return;
    this.lastHeartbeatAt = now;

    const payload = JSON.stringify({ sessionId: this.sessionId, deltaSeconds });

    // Prefer sendBeacon on unload
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`/api/view/${encodeURIComponent(this.linkId)}/heartbeat`, blob);
      return;
    }

    // Fallback (keepalive)
    fetch(`/api/view/${encodeURIComponent(this.linkId)}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  // pdf.js loader removed

  onVisibilityChange = () => {
    if (document.hidden) {
      this.sendFinalHeartbeat();
    } else {
      // reset timer anchor on return
      this.lastHeartbeatAt = Date.now();
    }
  };

  onBeforeUnload = () => {
    this.sendFinalHeartbeat();
  };
}
