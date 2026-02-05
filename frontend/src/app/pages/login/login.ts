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
import { HttpClient } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';

import { AuthService } from '../../services/auth.service';

type GoogleStatusResponse = { enabled: boolean };

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly googleEnabled = signal(false);

  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required])
  });

  readonly canSubmit = computed(() => this.form.valid && !this.loading());

  constructor() {
    this.http
      .get<GoogleStatusResponse>('/auth/google/status')
      .pipe(timeout({ first: 5000 }))
      .subscribe({
        next: (r) => this.googleEnabled.set(!!r?.enabled),
        error: () => this.googleEnabled.set(false)
      });
  }

  submit() {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.authService
      .login(this.form.getRawValue())
      .pipe(
        timeout({ first: 15000 }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/dashboard']);
        },
        error: (err: unknown) => {
          const msg =
            typeof err === 'object' && err !== null
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((err as any).error?.error as string | undefined) ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((err as any).message as string | undefined)
              : undefined;
          this.error.set(msg || 'Login failed.');
        }
      });
  }

  loginWithGoogle() {
    if (!this.googleEnabled()) return;
    window.location.href = '/auth/google';
  }
}
