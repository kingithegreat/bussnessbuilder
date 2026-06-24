import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen bg-[#F5F5F7] font-sans text-gray-900">
      <header class="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex items-center gap-3">
        <a routerLink="/" class="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium">
          <span>&larr; Back to Home</span>
        </a>
      </header>

      <main class="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-12">
          <h1 class="text-3xl md:text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
          <p class="text-gray-500 text-sm mb-10">Last updated: 25 June 2026</p>

          <div class="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p>BusinessFlow Studio ("we", "us", "our") operates the BusinessFlow Studio platform (the "Service"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.</p>
              <p class="mt-2">By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">2. Information We Collect</h2>
              <h3 class="font-semibold text-gray-900 mt-4 mb-2">2.1 Account Information</h3>
              <p>When you create an account, we collect:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Email address</li>
                <li>Display name</li>
                <li>Authentication provider details (Google account info if using Google Sign-In)</li>
              </ul>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">2.2 Business Information</h3>
              <p>Information you provide about your business, including:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Business name, type, and description</li>
                <li>Contact details (business email, phone, address)</li>
                <li>Service offerings and pricing</li>
                <li>Testimonials, FAQs, and other content you create</li>
                <li>Images you upload (including logos and background images)</li>
                <li>Site customisation preferences (colours, gradients, fonts, layouts)</li>
                <li>Site templates (up to 3 saved versions of your website)</li>
                <li>Payment link configurations (Stripe payment link URLs)</li>
                <li>SEO settings (meta titles, descriptions, Open Graph images)</li>
                <li>Content pages you create</li>
              </ul>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">2.3 Enquiry Data</h3>
              <p>When visitors submit enquiries through your public page, we collect the information they provide in the contact form (name, email, phone, message, and any custom form fields you configure).</p>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">2.4 Analytics Data</h3>
              <p>We collect page view statistics for your public page, including daily view counts. This data is aggregated and does not include personally identifiable information about your visitors.</p>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">2.5 Usage Data</h3>
              <p>We automatically collect certain information when you use the Service, including browser type, device information, IP address, pages visited, and timestamps.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Provide, maintain, and improve the Service</li>
                <li>Create and manage your account</li>
                <li>Generate and host your public business page</li>
                <li>Deliver enquiry notifications and manage your inbox</li>
                <li>Provide AI-powered content generation (when enabled)</li>
                <li>Process payments and manage subscriptions (when applicable)</li>
                <li>Send service-related communications</li>
                <li>Detect, prevent, and address technical issues or abuse</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">4. Third-Party Services</h2>
              <p>We use the following third-party services to operate the platform:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Google Firebase</strong> — Authentication, database (Firestore), and file storage. Data is stored in Google Cloud (us-central1 region). See <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Firebase Privacy Policy</a>.</li>
                <li><strong>Google Cloud Run</strong> — Hosts the application. See <a href="https://cloud.google.com/terms/cloud-privacy-notice" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Google Cloud Privacy Notice</a>.</li>
                <li><strong>Google Gemini AI</strong> — Powers AI content generation features. Content you submit for AI generation may be processed by Google. See <a href="https://ai.google.dev/terms" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Gemini API Terms</a>.</li>
                <li><strong>Stripe</strong> — Processes payments when you enable payment links. We store only your Stripe payment link URLs, not payment card data. See <a href="https://stripe.com/privacy" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Stripe Privacy Policy</a>.</li>
                <li><strong>Unsplash</strong> — Provides stock photography. No personal data is shared with Unsplash.</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">5. Cookies and Local Storage</h2>
              <p>We use cookies and browser local storage for:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Authentication</strong> — Firebase uses cookies to maintain your login session</li>
                <li><strong>Preferences</strong> — We store your cookie consent preference locally</li>
              </ul>
              <p class="mt-2">We do not use advertising or tracking cookies. You can manage cookies through your browser settings, but disabling them may affect the Service's functionality.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">6. Data Sharing</h2>
              <p>We do not sell your personal data. We may share information in the following circumstances:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Public pages</strong> — Business information you publish on your public page is visible to anyone with the link</li>
                <li><strong>Service providers</strong> — With third-party services listed in Section 4, solely to operate the platform</li>
                <li><strong>Legal requirements</strong> — When required by law, regulation, or legal process</li>
                <li><strong>Safety</strong> — To protect the rights, safety, or property of our users or the public</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">7. Data Retention</h2>
              <p>We retain your data for as long as your account is active. If you delete your account, we will delete your personal data and business content within 30 days, except where we are required to retain it by law.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">8. Data Security</h2>
              <p>We use industry-standard security measures to protect your data, including encryption in transit (HTTPS/TLS) and at rest (Firebase encryption). However, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">9. Your Rights</h2>
              <p>Depending on your location, you may have the right to:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate personal data</li>
                <li>Delete your personal data</li>
                <li>Export your data (using the Export feature in the admin dashboard)</li>
                <li>Withdraw consent for data processing</li>
                <li>Lodge a complaint with a data protection authority</li>
              </ul>
              <p class="mt-2">To exercise these rights, contact us at the email address below.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">10. Children's Privacy</h2>
              <p>The Service is not intended for children under 16 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will delete it promptly.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">11. Changes to This Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">12. Contact Us</h2>
              <p>If you have questions about this Privacy Policy or your data, contact us at:</p>
              <p class="mt-2 font-medium text-gray-900">BusinessFlow Studio<br>Email: privacy&#64;businessflow.studio</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  `
})
export class PrivacyPolicyComponent {}
