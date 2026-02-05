import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { timeout } from 'rxjs';

import { AuthService } from '../../services/auth.service';

type Status = 'verifying' | 'success' | 'error';

@Component({
  selector: 'app-verify',
  imports: [CommonModule, RouterModule],
  templateUrl: './verify.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VerifyComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly status = signal<Status>('verifying');
  readonly message = signal('');

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.status.set('error');
      this.message.set('No verification token provided.');
      return;
    }

    this.authService
      .verify(token)
      .pipe(timeout({ first: 15000 }))
      .subscribe({
        next: (res) => {
          this.status.set('success');
          this.message.set(res?.message || 'Email verified successfully!');
          setTimeout(() => void this.router.navigate(['/login']), 2500);
        },
        error: (err: unknown) => {
          const msg =
            typeof err === 'object' && err !== null
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((err as any).error?.error as string | undefined) ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((err as any).message as string | undefined)
              : undefined;
          this.status.set('error');
          this.message.set(msg || 'Verification failed. Link may be expired.');
        }
      });
  }
}
