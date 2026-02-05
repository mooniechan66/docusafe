import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.ts';
import { SignupComponent } from './pages/signup/signup.ts';
import { VerifyComponent } from './pages/verify/verify.ts';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'verify', component: VerifyComponent },
  { path: '', redirectTo: '/login', pathMatch: 'full' }
];
