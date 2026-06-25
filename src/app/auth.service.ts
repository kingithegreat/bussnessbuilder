import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User,
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
} from '@angular/fire/firestore';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  readonly currentUser = signal<AppUser | null>(null);
  readonly isLoggedIn = signal(false);
  readonly isLoading = signal(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          const appUser: AppUser = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
          };
          this.currentUser.set(appUser);
          this.isLoggedIn.set(true);
          try {
            await this.ensureUserDoc(user);
          } catch (e) {
            console.warn('Could not create user doc:', e);
          }
        } else {
          this.currentUser.set(null);
          this.isLoggedIn.set(false);
        }
        this.isLoading.set(false);
      });
    } else {
      this.isLoading.set(false);
    }
  }

  private async ensureUserDoc(user: User) {
    const userRef = doc(this.firestore, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email || '',
        displayName: user.displayName || '',
        createdAt: new Date().toISOString(),
        subscriptionTier: 'free',
      });
    }
  }

  async signUpWithEmail(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred;
  }

  async signInWithEmail(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      return await signInWithPopup(this.auth, provider);
    } catch (e: unknown) {
      const code = e && typeof e === 'object' && 'code' in e ? e.code : undefined;
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        return signInWithRedirect(this.auth, provider);
      }
      throw e;
    }
  }

  async resetPassword(email: string) {
    return sendPasswordResetEmail(this.auth, email);
  }

  async getIdToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (!user) return null;
    return user.getIdToken();
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/']);
  }
}
