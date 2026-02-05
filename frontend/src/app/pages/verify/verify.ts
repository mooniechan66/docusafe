import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify.html'
})
export class VerifyComponent implements OnInit {
  status: 'verifying' | 'success' | 'error' = 'verifying';
  message = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.verify(token);
      } else {
        this.status = 'error';
        this.message = 'No verification token provided.';
      }
    });
  }

  verify(token: string) {
    this.authService.verify(token).subscribe({
      next: (res) => {
        this.status = 'success';
        this.message = res.message || 'Email verified successfully!';
        // Redirect to login after 3 seconds
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: (err) => {
        this.status = 'error';
        this.message = err.error?.error || 'Verification failed. Link may be expired.';
      }
    });
  }
}
