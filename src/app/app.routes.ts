import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { authGuard, setupGuard, publicGuard, appAdminGuard, previewFrameGuard } from './auth.guard';

export const routes: Routes = [
  // Keep the landing page immediate; load each workflow only when it is opened.
  { path: '', component: LandingComponent },
  { path: 'login', loadComponent: () => import('./login.component').then(m => m.LoginComponent) },
  { path: 'signup', loadComponent: () => import('./login.component').then(m => m.LoginComponent) },
  { path: 'privacy', loadComponent: () => import('./privacy-policy.component').then(m => m.PrivacyPolicyComponent) },
  { path: 'terms', loadComponent: () => import('./terms.component').then(m => m.TermsComponent) },
  { path: 'pricing', loadComponent: () => import('./pricing.component').then(m => m.PricingComponent) },
  { path: 'site/:uid', loadComponent: () => import('./site-view.component').then(m => m.SiteViewComponent) },
  { path: 'site/:uid/pages/:slug', loadComponent: () => import('./public-content-page.component').then(m => m.PublicContentPageComponent) },
  { path: 'pages/:slug', loadComponent: () => import('./content-page-view.component').then(m => m.ContentPageViewComponent) },
  { path: 'setup', loadComponent: () => import('./setup.component').then(m => m.SetupWizardComponent), canActivate: [setupGuard] },
  { path: 'public', loadComponent: () => import('./public-page.component').then(m => m.PublicPageComponent), canActivate: [publicGuard] },
  // Content of the page builder's live-preview iframe. Rendered with zero
  // admin chrome; guarded auth-only (previewFrameGuard deliberately skips
  // dataService.init() so the iframe's DataService never autosaves).
  { path: 'preview-frame', loadComponent: () => import('./preview-frame.component').then(m => m.PreviewFrameComponent), canActivate: [previewFrameGuard] },
  {
    path: 'admin',
    loadComponent: () => import('./admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./admin-dashboard.component').then(m => m.AdminDashboardComponent) },
      { path: 'website', loadComponent: () => import('./admin-website.component').then(m => m.AdminWebsiteComponent) },
      { path: 'analytics', loadComponent: () => import('./admin-dashboard.component').then(m => m.AdminDashboardComponent), data: { view: 'analytics' } },
      { path: 'inbox', loadComponent: () => import('./admin-inbox.component').then(m => m.AdminInboxComponent) },
      { path: 'content', loadComponent: () => import('./admin-content.component').then(m => m.AdminContentComponent) },
      { path: 'ai', loadComponent: () => import('./admin-ai.component').then(m => m.AdminAiToolsComponent) },
      { path: 'customisation', loadComponent: () => import('./admin-customisation.component').then(m => m.AdminCustomisationComponent) },
      { path: 'builder', loadComponent: () => import('./admin-builder.component').then(m => m.AdminBuilderComponent) },
      { path: 'form-builder', loadComponent: () => import('./admin-form-builder.component').then(m => m.AdminFormBuilderComponent) },
      { path: 'pages', loadComponent: () => import('./admin-pages.component').then(m => m.AdminPagesComponent) },
      { path: 'payments', loadComponent: () => import('./admin-payments.component').then(m => m.AdminPaymentsComponent) },
      { path: 'growth', loadComponent: () => import('./admin-growth.component').then(m => m.AdminGrowthComponent) },
      { path: 'settings', loadComponent: () => import('./admin-settings.component').then(m => m.AdminSettingsComponent) }
    ]
  },
  {
    path: 'app-admin',
    loadComponent: () => import('./app-admin-layout.component').then(m => m.AppAdminLayoutComponent),
    canActivate: [appAdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./app-admin-dashboard.component').then(m => m.AppAdminDashboardComponent) },
      { path: 'funnel', loadComponent: () => import('./app-admin-funnel.component').then(m => m.AppAdminFunnelComponent) },
      { path: 'users', loadComponent: () => import('./app-admin-users.component').then(m => m.AppAdminUsersComponent) },
      { path: 'discounts', loadComponent: () => import('./app-admin-discounts.component').then(m => m.AppAdminDiscountsComponent) },
    ]
  },
  { path: '**', redirectTo: '' }
];
