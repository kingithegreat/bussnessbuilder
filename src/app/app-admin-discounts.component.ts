import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

interface Discount {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  applicableTiers: string[];
  active: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-discounts',
  standalone: true,
  imports: [FormsModule, MatIconModule, DatePipe],
  template: `
    <div class="max-w-4xl space-y-6">
      <div>
        <h1 class="text-2xl font-black text-gray-900 tracking-tight">Discount Codes</h1>
        <p class="text-sm text-gray-500">Create promo codes for customers to use at checkout.</p>
      </div>

      <!-- Create new -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2">
            <mat-icon class="text-[18px] text-gray-400">add_circle</mat-icon> Create Discount
          </h2>
        </div>
        <div class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="discount-code" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Code</label>
              <input id="discount-code" type="text" [(ngModel)]="newCode" placeholder="e.g. LAUNCH20" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm uppercase font-mono focus:ring-2 focus:ring-red-500 outline-none">
            </div>
            <div>
              <label for="discount-type" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Type</label>
              <select id="discount-type" [(ngModel)]="newType" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none">
                <option value="percent">Percentage Off</option>
                <option value="fixed">Fixed Amount Off</option>
              </select>
            </div>
            <div>
              <label for="discount-value" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Value</label>
              <input id="discount-value" type="number" [(ngModel)]="newValue" [placeholder]="newType === 'percent' ? 'e.g. 20' : 'e.g. 5'" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none">
            </div>
            <div>
              <label for="discount-max-uses" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Max Uses (optional)</label>
              <input id="discount-max-uses" type="number" [(ngModel)]="newMaxUses" placeholder="Unlimited" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none">
            </div>
          </div>
          <button (click)="createDiscount()" [disabled]="!newCode.trim() || !newValue" class="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            <mat-icon class="text-[18px]">add</mat-icon> Create Code
          </button>
        </div>
      </div>

      <!-- List -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin h-8 w-8 border-3 border-red-600 border-t-transparent rounded-full"></div>
        </div>
      } @else if (discounts().length === 0) {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
          <mat-icon class="text-gray-300 text-[48px]">local_offer</mat-icon>
          <p class="text-gray-500 text-sm mt-2">No discount codes yet.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (discount of discounts(); track discount.code) {
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                  <mat-icon class="text-red-600 text-[24px]">local_offer</mat-icon>
                </div>
                <div>
                  <p class="font-black text-gray-900 font-mono text-lg">{{ discount.code }}</p>
                  <p class="text-sm text-gray-500">
                    {{ discount.type === 'percent' ? discount.value + '% off' : '$' + discount.value + ' off' }}
                    @if (discount.maxUses) {
                      · {{ discount.usedCount }}/{{ discount.maxUses }} used
                    } @else {
                      · {{ discount.usedCount }} used
                    }
                  </p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs text-gray-400">{{ discount.createdAt | date:'mediumDate' }}</span>
                <button (click)="deleteDiscount(discount.code)" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <mat-icon class="text-[18px]">delete</mat-icon>
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class AppAdminDiscountsComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  loading = signal(true);
  discounts = signal<Discount[]>([]);

  newCode = '';
  newType: 'percent' | 'fixed' = 'percent';
  newValue: number | null = null;
  newMaxUses: number | null = null;

  async ngOnInit() {
    await this.loadDiscounts();
  }

  private async loadDiscounts() {
    const token = await this.authService.getIdToken();
    if (!token) return;

    this.http.get<{ discounts: Discount[] }>('/api/admin/discounts', {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({
      next: (data) => {
        this.discounts.set(data.discounts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  async createDiscount() {
    if (!this.newCode.trim() || !this.newValue) return;
    const token = await this.authService.getIdToken();
    if (!token) return;

    this.http.post('/api/admin/discounts', {
      code: this.newCode.trim().toUpperCase(),
      type: this.newType,
      value: this.newValue,
      maxUses: this.newMaxUses || null,
    }, {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({
      next: () => {
        this.toast.success(`Discount "${this.newCode.toUpperCase()}" created!`);
        this.newCode = '';
        this.newValue = null;
        this.newMaxUses = null;
        this.loadDiscounts();
      },
      error: (err) => {
        this.toast.error(err.error?.error || 'Failed to create discount');
      },
    });
  }

  async deleteDiscount(code: string) {
    if (!confirm(`Delete discount code "${code}"?`)) return;
    const token = await this.authService.getIdToken();
    if (!token) return;

    this.http.delete(`/api/admin/discounts/${code}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).subscribe({
      next: () => {
        this.toast.success(`Discount "${code}" deleted.`);
        this.discounts.update(list => list.filter(d => d.code !== code));
      },
      error: () => this.toast.error('Failed to delete discount'),
    });
  }
}
