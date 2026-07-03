import { Routes } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LoginComponent } from './login.component';
import { SetupWizardComponent } from './setup.component';
import { PublicPageComponent } from './public-page.component';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { AdminInboxComponent } from './admin-inbox.component';
import { AdminContentComponent } from './admin-content.component';
import { AdminAiToolsComponent } from './admin-ai.component';
import { AdminCustomisationComponent } from './admin-customisation.component';
import { AdminBuilderComponent } from './admin-builder.component';
import { AdminFormBuilderComponent } from './admin-form-builder.component';
import { PrivacyPolicyComponent } from './privacy-policy.component';
import { TermsComponent } from './terms.component';
import { PricingComponent } from './pricing.component';
import { AdminSettingsComponent } from './admin-settings.component';
import { AdminPagesComponent } from './admin-pages.component';
import { AdminPaymentsComponent } from './admin-payments.component';
import { AdminGrowthComponent } from './admin-growth.component';
import { ContentPageViewComponent } from './content-page-view.component';
import { PublicContentPageComponent } from './public-content-page.component';
import { SiteViewComponent } from './site-view.component';
import { PreviewFrameComponent } from './preview-frame.component';
import { AppAdminLayoutComponent } from './app-admin-layout.component';
import { AppAdminDashboardComponent } from './app-admin-dashboard.component';
import { AppAdminUsersComponent } from './app-admin-users.component';
import { AppAdminDiscountsComponent } from './app-admin-discounts.component';
import { authGuard, setupGuard, publicGuard, appAdminGuard, previewFrameGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: LoginComponent },
  { path: 'privacy', component: PrivacyPolicyComponent },
  { path: 'terms', component: TermsComponent },
  { path: 'pricing', component: PricingComponent },
  { path: 'site/:uid', component: SiteViewComponent },
  { path: 'site/:uid/pages/:slug', component: PublicContentPageComponent },
  { path: 'pages/:slug', component: ContentPageViewComponent },
  { path: 'setup', component: SetupWizardComponent, canActivate: [setupGuard] },
  { path: 'public', component: PublicPageComponent, canActivate: [publicGuard] },
  // Content of the page builder's live-preview iframe. Rendered with zero
  // admin chrome; guarded auth-only (previewFrameGuard deliberately skips
  // dataService.init() so the iframe's DataService never autosaves).
  { path: 'preview-frame', component: PreviewFrameComponent, canActivate: [previewFrameGuard] },
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'inbox', component: AdminInboxComponent },
      { path: 'content', component: AdminContentComponent },
      { path: 'ai', component: AdminAiToolsComponent },
      { path: 'customisation', component: AdminCustomisationComponent },
      { path: 'builder', component: AdminBuilderComponent },
      { path: 'form-builder', component: AdminFormBuilderComponent },
      { path: 'pages', component: AdminPagesComponent },
      { path: 'payments', component: AdminPaymentsComponent },
      { path: 'growth', component: AdminGrowthComponent },
      { path: 'settings', component: AdminSettingsComponent }
    ]
  },
  {
    path: 'app-admin',
    component: AppAdminLayoutComponent,
    canActivate: [appAdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AppAdminDashboardComponent },
      { path: 'users', component: AppAdminUsersComponent },
      { path: 'discounts', component: AppAdminDiscountsComponent },
    ]
  },
  { path: '**', redirectTo: '' }
];
