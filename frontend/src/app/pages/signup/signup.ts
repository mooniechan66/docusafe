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
import { RouterModule } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import { AuthService } from '../../services/auth.service';

type SignupResponse = {
  message?: string;
  verificationLink?: string;
  previewUrl?: string | null;
};

@Component({
  selector: 'app-signup',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './signup.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SignupComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);

  readonly verificationLink = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);

  readonly form = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required, Validators.minLength(8)])
  });

  readonly canSubmit = computed(() => this.form.valid && !this.loading());

  submit() {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);

    this.authService
      .signup(this.form.getRawValue())
      .pipe(
        timeout({ first: 20000 }),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (resp: SignupResponse) => {
          this.success.set(true);
          this.verificationLink.set(resp?.verificationLink || null);
          this.previewUrl.set(resp?.previewUrl || null);
        },
        error: (err: unknown) => {
          const msg =
            typeof err === 'object' && err !== null
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((err as any).error?.error as string | undefined) ||
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ((err as any).message as string | undefined)
              : undefined;
          this.error.set(msg || 'Signup failed.');
        }
      });
  }
}
