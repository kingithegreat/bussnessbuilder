import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private platformId = inject(PLATFORM_ID);
  private storage = inject(Storage);

  readonly uploading = signal(false);
  readonly progress = signal(0);

  async uploadImage(uid: string, file: File, path: string): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) return '';

    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const storageRef = ref(this.storage, `users/${uid}/images/${path}/${fileName}`);

    this.uploading.set(true);
    this.progress.set(0);

    return new Promise<string>((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file);

      task.on('state_changed',
        (snapshot) => {
          this.progress.set(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        },
        (error) => {
          this.uploading.set(false);
          this.progress.set(0);
          reject(error);
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          this.uploading.set(false);
          this.progress.set(0);
          resolve(url);
        }
      );
    });
  }

  async deleteImage(url: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !url) return;
    try {
      const storageRef = ref(this.storage, url);
      await deleteObject(storageRef);
    } catch {
      // Ignore — file may already be deleted or be an external URL
    }
  }
}
