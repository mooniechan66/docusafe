import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { finalize, timeout } from 'rxjs';

type ViewerState = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-viewer',
  imports: [CommonModule],
  templateUrl: './viewer.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  readonly linkId = signal(this.route.snapshot.paramMap.get('linkId') ?? '');
  readonly sessionId = signal(globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`);

  readonly state = signal<ViewerState>('loading');
  readonly error = signal<string | null>(null);

  readonly contentType = signal<string | null>(null);
  readonly imageUrl = signal<string | null>(null);
  readonly pdfUrl = signal<SafeResourceUrl | null>(null);

  private heartbeatTimer: number | null = null;
  private lastHeartbeatAt = Date.now();

  readonly isLoading = computed(() => this.state() === 'loading');
  readonly isReady = computed(() => this.state() === 'ready');

  constructor() {
    void this.fetchAndRender();

    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('beforeunload', this.onBeforeUnload);
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('beforeunload', this.onBeforeUnload);

    this.sendFinalHeartbeat();

    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    const img = this.imageUrl();
    if (img) URL.revokeObjectURL(img);
  }

  private async fetchAndRender(): Promise<void> {
    this.state.set('loading');
    this.error.set(null);
    this.contentType.set(null);
    this.imageUrl.set(null);
    this.pdfUrl.set(null);

    const url = `/api/view/${encodeURIComponent(this.linkId())}?sid=${encodeURIComponent(this.sessionId())}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const msg = await resp.text().catch(() => '');
        throw new Error(msg || `Failed to load document (${resp.status})`);
      }

      const ct = resp.headers.get('content-type');
      this.contentType.set(ct);

      const blob = await resp.blob();

      if ((ct || '').includes('application/pdf')) {
        const objectUrl = URL.createObjectURL(blob);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
      } else {
        this.imageUrl.set(URL.createObjectURL(blob));
      }

      this.state.set('ready');
      this.startHeartbeats();
    } catch (err: unknown) {
      const msg =
        typeof err === 'object' && err !== null
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ((err as any).message as string | undefined)
          : undefined;
      this.error.set(msg || 'Failed to load document.');
      this.state.set('error');
    }
  }

  private startHeartbeats() {
    this.lastHeartbeatAt = Date.now();

    this.heartbeatTimer = window.setInterval(() => {
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
      .post(`/api/view/${encodeURIComponent(this.linkId())}/heartbeat`, {
        sessionId: this.sessionId(),
        deltaSeconds
      })
      .pipe(timeout({ first: 5000 }), finalize(() => {}))
      .subscribe({
        next: () => {},
        error: () => {
          // ignore heartbeat errors
        }
      });
  }

  private sendFinalHeartbeat() {
    const now = Date.now();
    const deltaSeconds = Math.max(0, Math.round((now - this.lastHeartbeatAt) / 1000));
    if (!this.linkId() || deltaSeconds === 0) return;

    this.lastHeartbeatAt = now;

    const payload = JSON.stringify({ sessionId: this.sessionId(), deltaSeconds });

    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(`/api/view/${encodeURIComponent(this.linkId())}/heartbeat`, blob);
      return;
    }

    void fetch(`/api/view/${encodeURIComponent(this.linkId())}/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }

  onVisibilityChange = () => {
    if (document.hidden) {
      this.sendFinalHeartbeat();
    } else {
      this.lastHeartbeatAt = Date.now();
    }
  };

  onBeforeUnload = () => {
    this.sendFinalHeartbeat();
  };
}
