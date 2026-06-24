import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { DataService } from './data.service';
import { PaymentSettings, PaymentLink } from './types';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [FormsModule, MatIconModule],
  template: `
    <div class="max-w-3xl mx-auto space-y-6 pb-12">
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-black text-gray-900 tracking-tight">Payments</h1>
          <p class="text-sm text-gray-500 font-medium">Accept payments directly on your public page.</p>
        </div>
        <button (click)="save()" class="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-colors flex items-center gap-1.5">
          <mat-icon class="text-[18px]">save</mat-icon> Save
        </button>
      </div>

      <!-- Stripe Connect -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">account_balance</mat-icon> Payment Gateway</h2>
        </div>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold text-gray-700">Accept Payments</p>
              <p class="text-xs text-gray-500">Enable payment buttons on your public page</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" [(ngModel)]="settings.enabled" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          @if (settings.enabled) {
            <div>
              <label for="stripeId" class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Stripe Account ID</label>
              <input id="stripeId" type="text" [(ngModel)]="settings.stripeAccountId" placeholder="acct_..." class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono">
              <p class="text-xs text-gray-400 mt-1">Connect your Stripe account to receive payments. <a href="https://stripe.com" target="_blank" class="text-blue-600 hover:underline">Create a Stripe account</a></p>
            </div>
          }
        </div>
      </div>

      <!-- Payment Links -->
      @if (settings.enabled) {
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h2 class="font-bold text-gray-900 flex items-center gap-2"><mat-icon class="text-[18px] text-gray-400">payments</mat-icon> Payment Links</h2>
            <button (click)="addLink()" class="text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
              <mat-icon class="text-[16px]">add</mat-icon> Add Link
            </button>
          </div>
          <div class="divide-y divide-gray-100">
            @for (link of settings.paymentLinks; track link.id; let i = $index) {
              <div class="p-4 space-y-3">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label [for]="'pn_'+link.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Name</label>
                    <input [id]="'pn_'+link.id" type="text" [(ngModel)]="link.name" placeholder="e.g. Standard Clean" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                  </div>
                  <div>
                    <label [for]="'pa_'+link.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount</label>
                    <div class="flex items-center gap-2">
                      <select [(ngModel)]="link.currency" class="px-2 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold">
                        <option value="USD">$</option>
                        <option value="GBP">£</option>
                        <option value="EUR">€</option>
                        <option value="AUD">A$</option>
                        <option value="NZD">NZ$</option>
                      </select>
                      <input [id]="'pa_'+link.id" type="number" [(ngModel)]="link.amount" placeholder="0.00" min="0" step="0.01" class="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    </div>
                  </div>
                  <div>
                    <label [for]="'pl_'+link.id" class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Stripe Payment Link</label>
                    <input [id]="'pl_'+link.id" type="text" [(ngModel)]="link.stripePaymentLink" placeholder="https://buy.stripe.com/..." class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono">
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <div>
                    <input [id]="'pd_'+link.id" type="text" [(ngModel)]="link.description" placeholder="Brief description..." class="px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-xs w-64">
                  </div>
                  <div class="flex items-center gap-3">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" [(ngModel)]="link.active" class="rounded text-blue-600 focus:ring-blue-500">
                      <span class="text-xs font-bold text-gray-700">Active</span>
                    </label>
                    <button (click)="removeLink(i)" class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                      <mat-icon class="text-[16px]">delete</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
            @if (settings.paymentLinks.length === 0) {
              <div class="p-8 text-center text-gray-400 text-sm">
                No payment links yet. Add one to start accepting payments.
              </div>
            }
          </div>
        </div>

        <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
          <p class="font-bold mb-2">How it works</p>
          <ol class="list-decimal pl-4 space-y-1 text-xs">
            <li>Create a <a href="https://stripe.com" target="_blank" class="text-blue-600 hover:underline font-medium">Stripe account</a> if you don't have one</li>
            <li>Go to Stripe Dashboard → Payment Links → create a link for each service</li>
            <li>Paste the payment link URLs above</li>
            <li>"Pay Now" buttons will appear on your public page next to matching services</li>
          </ol>
        </div>
      }
    </div>
  `
})
export class AdminPaymentsComponent implements OnInit {
  private dataService = inject(DataService);

  settings: PaymentSettings = {
    enabled: false,
    paymentLinks: [],
  };

  ngOnInit() {
    const saved = this.dataService.getPaymentSettings();
    if (saved) this.settings = JSON.parse(JSON.stringify(saved));
  }

  addLink() {
    this.settings.paymentLinks.push({
      id: 'pl_' + Date.now(),
      name: '',
      description: '',
      amount: 0,
      currency: 'USD',
      active: true,
    });
  }

  removeLink(index: number) {
    this.settings.paymentLinks.splice(index, 1);
  }

  save() {
    this.dataService.setPaymentSettings(this.settings);
    alert('Payment settings saved!');
  }
}
