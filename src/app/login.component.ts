import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { SlugService } from './slug.service';
import { ToastService } from './toast.service';
import { PENDING_PUBLISH_KEY } from './setup-draft';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, MatIconModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-4 font-sans">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <a routerLink="/" class="inline-flex items-center gap-2 mb-6">
            <div class="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <mat-icon>business</mat-icon>
            </div>
            <span class="text-xl font-bold tracking-tight text-gray-900">BusinessFlow Studio</span>
          </a>
          <h1 class="text-3xl font-bold text-gray-900">{{ isSignUp() ? 'Create your account' : 'Welcome back' }}</h1>
          <p class="text-gray-500 mt-2">{{ isSignUp() ? 'Start building your business site' : 'Sign in to your dashboard' }}</p>
        </div>

        @if (isSignUp() && pendingPublish()) {
          <div class="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <mat-icon class="text-[20px] text-blue-600 shrink-0">rocket_launch</mat-icon>
            <p class="text-sm text-blue-900 leading-relaxed">
              <strong>Your site is ready.</strong> Create a free account and it goes live straight away — everything you entered is saved.
            </p>
          </div>
        }

        <div class="bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/60 p-8">
          <button (click)="googleSignIn()" [disabled]="loading()" class="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors mb-2">
            <svg class="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <p class="text-[11px] text-gray-400 text-center mb-6">By continuing, you agree to our <a routerLink="/terms" target="_blank" class="text-blue-500 hover:underline">Terms</a> and <a routerLink="/privacy" target="_blank" class="text-blue-500 hover:underline">Privacy Policy</a></p>

          <div class="relative mb-6">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200"></div></div>
            <div class="relative flex justify-center text-xs"><span class="bg-white px-4 text-gray-400 uppercase tracking-wider">or</span></div>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            @if (isSignUp()) {
              <div class="mb-4">
                <label for="displayName" class="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input id="displayName" formControlName="displayName" type="text" placeholder="Your name" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all">
              </div>
            }
            <div class="mb-4">
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input id="email" formControlName="email" type="email" placeholder="you&#64;example.com" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all">
            </div>
            <div class="mb-6">
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input id="password" formControlName="password" type="password" placeholder="At least 6 characters" class="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-sm transition-all">
              @if (form.get('password')?.invalid && form.get('password')?.touched) {
                <p class="text-red-500 text-xs mt-1">Password must be at least 6 characters</p>
              }
            </div>

            @if (isSignUp()) {
              <div class="mb-6">
                <label class="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" formControlName="agreeTerms" class="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                  <span class="text-xs text-gray-500 leading-relaxed">I agree to the <a routerLink="/terms" target="_blank" class="text-blue-600 font-medium hover:underline">Terms of Service</a> and <a routerLink="/privacy" target="_blank" class="text-blue-600 font-medium hover:underline">Privacy Policy</a></span>
                </label>
                @if (form.get('agreeTerms')?.invalid && form.get('agreeTerms')?.touched) {
                  <p class="text-red-500 text-xs mt-1">You must agree to the Terms and Privacy Policy</p>
                }
              </div>
            }

            @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
              <div class="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">Please enter a valid email address</div>
            }

            @if (error()) {
              <div class="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">{{ error() }}</div>
            }

            <button type="submit" [disabled]="loading()" class="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
              @if (loading()) {
                <span class="flex items-center justify-center gap-2"><mat-icon class="animate-spin text-[18px]">autorenew</mat-icon> Please wait...</span>
              } @else {
                {{ isSignUp() ? 'Create Account' : 'Sign In' }}
              }
            </button>
          </form>

          @if (!isSignUp()) {
            <button (click)="forgotPassword()" class="w-full text-center text-sm text-blue-600 hover:text-blue-700 mt-4 font-medium">Forgot password?</button>
          }
        </div>

        <p class="text-center text-sm text-gray-500 mt-6">
          @if (isSignUp()) {
            Already have an account? <button (click)="toggleMode()" class="text-blue-600 font-medium hover:text-blue-700">Sign in</button>
          } @else {
            Don't have an account? <button (click)="toggleMode()" class="text-blue-600 font-medium hover:text-blue-700">Create one</button>
          }
        </p>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  private auth = inject(AuthService);
  private data = inject(DataService);
  private slug = inject(SlugService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private platformId = inject(PLATFORM_ID);

  isSignUp = signal(false);
  /** True when the visitor finished the wizard logged-out and is here to publish. */
  pendingPublish = signal(false);

  ngOnInit() {
    if (this.router.url.includes('signup')) {
      this.isSignUp.set(true);
    }
    this.applyModeValidators();
    if (isPlatformBrowser(this.platformId)) {
      this.pendingPublish.set(!!localStorage.getItem(PENDING_PUBLISH_KEY));
    }
  }
  loading = signal(false);
  error = signal('');

  form = this.fb.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    agreeTerms: [false],
  });

  toggleMode() {
    this.isSignUp.update(v => !v);
    this.error.set('');
    this.applyModeValidators();
  }

  /**
   * The terms checkbox is only required when signing up. Without a validator it
   * had no `invalid` state, so its "you must agree" message could never render
   * and the submit button just sat disabled with no explanation — a dead end
   * right at the last step of the funnel.
   */
  private applyModeValidators() {
    const agree = this.form.get('agreeTerms');
    if (!agree) return;
    if (this.isSignUp()) {
      agree.setValidators(Validators.requiredTrue);
    } else {
      agree.clearValidators();
    }
    agree.updateValueAndValidity({ emitEvent: false });
  }

  async onSubmit() {
    if (this.form.invalid) {
      // Say why instead of silently doing nothing.
      this.form.markAllAsTouched();
      if (this.form.get('agreeTerms')?.invalid) {
        this.error.set('Please accept the Terms of Service and Privacy Policy to continue.');
      } else if (this.form.get('email')?.invalid) {
        this.error.set('Please enter a valid email address.');
      } else if (this.form.get('password')?.invalid) {
        this.error.set('Password must be at least 6 characters.');
      } else {
        this.error.set('Please complete the form to continue.');
      }
      return;
    }
    this.loading.set(true);
    this.error.set('');

    const { email, password, displayName } = this.form.value;

    try {
      if (this.isSignUp()) {
        await this.auth.signUpWithEmail(email!, password!, displayName || '');
      } else {
        await this.auth.signInWithEmail(email!, password!);
      }
      await this.navigateAfterAuth();
    } catch (e: unknown) {
      this.error.set(this.friendlyError(this.errorCode(e)));
    } finally {
      this.loading.set(false);
    }
  }

  async googleSignIn() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.signInWithGoogle();
      await this.navigateAfterAuth();
    } catch (e: unknown) {
      const code = this.errorCode(e);
      if (code !== 'auth/popup-closed-by-user') {
        this.error.set(this.friendlyError(code));
      }
    } finally {
      this.loading.set(false);
    }
  }

  async forgotPassword() {
    const email = this.form.get('email')?.value;
    if (!email) {
      this.error.set('Enter your email address first.');
      return;
    }
    try {
      await this.auth.resetPassword(email);
      this.error.set('');
      this.toast.success('Password reset email sent! Check your inbox.');
    } catch (e: unknown) {
      this.error.set(this.friendlyError(this.errorCode(e)));
    }
  }

  /**
   * `data.init()` migrates any site built logged-out (stashed under
   * `businessflow_state`) into Firestore, so a visitor who filled the wizard
   * first lands on a finished, published site rather than an empty wizard.
   */
  private async navigateAfterAuth() {
    const uid = this.auth.currentUser()?.uid;
    if (!uid) return;

    await this.data.init(uid);

    const justPublished = this.consumePendingPublish();

    if (this.data.isSetupComplete()) {
      // Claim the friendly /site/<slug> URL — for wizard-first visitors this is
      // the first moment a token exists, and it doubles as a retry for anyone
      // whose claim failed at publish time.
      await this.slug.claimIfMissing();
      this.router.navigate(['/admin/dashboard'], justPublished ? { queryParams: { welcome: 1 } } : {});
    } else {
      this.router.navigate(['/setup']);
    }
  }

  /** Read-and-clear the "came here to publish" flag. */
  private consumePendingPublish(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      const pending = !!localStorage.getItem(PENDING_PUBLISH_KEY);
      localStorage.removeItem(PENDING_PUBLISH_KEY);
      return pending;
    } catch {
      return false;
    }
  }

  private errorCode(error: unknown): string {
    if (error && typeof error === 'object') {
      const code = 'code' in error ? error.code : undefined;
      const message = 'message' in error ? error.message : undefined;
      if (typeof code === 'string') return code;
      if (typeof message === 'string') return message;
    }
    return 'unknown';
  }

  private friendlyError(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.',
      'auth/unauthorized-domain': 'This domain is not authorized. Please contact support.',
      'auth/operation-not-allowed': 'This sign-in method is not enabled.',
      'auth/invalid-api-key': 'Configuration error. Please contact support.',
    };
    return map[code] || `Something went wrong (${code || 'unknown'}). Please try again.`;
  }
}
