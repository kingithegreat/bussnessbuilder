import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
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
          <h1 class="text-3xl md:text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p class="text-gray-500 text-sm mb-10">Last updated: 25 June 2026</p>

          <div class="prose prose-gray max-w-none space-y-8 text-sm leading-relaxed text-gray-700">
            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">1. Agreement to Terms</h2>
              <p>By accessing or using BusinessFlow Studio (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.</p>
              <p class="mt-2">These Terms apply to all users of the Service, including visitors, registered users, and anyone who accesses any part of the Service.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">2. Description of Service</h2>
              <p>BusinessFlow Studio is a web-based platform that enables small businesses to create and manage a public-facing business page, receive and manage enquiries, and use AI-powered tools to generate business content. The Service includes:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>A page builder with customisable sections, layout variants, and background images</li>
                <li>Site templates — save up to 3 versions of your site and deploy one as your live page</li>
                <li>An enquiry inbox for managing customer leads</li>
                <li>AI content generation tools powered by Google Gemini</li>
                <li>A form builder for custom contact forms with spam protection</li>
                <li>Payment links integration via Stripe for accepting payments on your public page</li>
                <li>Page view analytics and dashboard</li>
                <li>Multi-page content management</li>
                <li>Stock photo integration via Unsplash</li>
                <li>SEO controls for search engines and social media</li>
                <li>Data export and import tools</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">3. Accounts</h2>
              <h3 class="font-semibold text-gray-900 mt-4 mb-2">3.1 Registration</h3>
              <p>To use most features, you must create an account using a valid email address or Google Sign-In. You must provide accurate information and keep your account credentials secure.</p>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">3.2 Account Security</h3>
              <p>You are responsible for all activity under your account. Notify us immediately if you suspect unauthorised access. We are not liable for losses caused by unauthorised use of your account.</p>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">3.3 Account Termination</h3>
              <p>You may delete your account at any time. We may suspend or terminate accounts that violate these Terms, with or without notice.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">4. User Content</h2>
              <h3 class="font-semibold text-gray-900 mt-4 mb-2">4.1 Ownership</h3>
              <p>You retain ownership of all content you create, upload, or submit through the Service ("User Content"), including business information, descriptions, images, and form configurations.</p>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">4.2 Licence Grant</h3>
              <p>By publishing User Content through the Service, you grant us a non-exclusive, worldwide, royalty-free licence to host, display, and distribute that content solely for the purpose of operating the Service (e.g., displaying your public page to visitors).</p>

              <h3 class="font-semibold text-gray-900 mt-4 mb-2">4.3 Content Responsibility</h3>
              <p>You are solely responsible for your User Content. You represent that:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>You own or have the right to use all content you publish</li>
                <li>Your content does not infringe any third party's intellectual property rights</li>
                <li>Your content does not contain false, misleading, or deceptive information</li>
                <li>Your content complies with all applicable laws and regulations</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">5. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Violate any applicable law or regulation</li>
                <li>Publish content that is illegal, harmful, threatening, abusive, defamatory, or obscene</li>
                <li>Impersonate any person or entity</li>
                <li>Distribute spam, malware, or phishing content</li>
                <li>Attempt to gain unauthorised access to other users' accounts or data</li>
                <li>Interfere with or disrupt the Service or its infrastructure</li>
                <li>Scrape, crawl, or use automated tools to access the Service without permission</li>
                <li>Use the Service to promote illegal activities or products</li>
              </ul>
              <p class="mt-2">We reserve the right to remove content and suspend accounts that violate these rules.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">6. AI-Generated Content</h2>
              <p>The Service offers AI-powered content generation using Google Gemini. You acknowledge that:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>AI-generated content is provided as a starting point and should be reviewed before publishing</li>
                <li>We do not guarantee the accuracy, completeness, or suitability of AI-generated content</li>
                <li>You are responsible for reviewing and editing AI-generated content before it appears on your public page</li>
                <li>Content submitted for AI processing may be sent to Google's API services</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">7. Stock Images</h2>
              <p>The Service provides access to stock photography via the Unsplash API. Images sourced from Unsplash are subject to the <a href="https://unsplash.com/license" target="_blank" rel="noopener" class="text-blue-600 hover:underline">Unsplash Licence</a>. Attribution is provided automatically within the Service where applicable.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">8. Subscriptions and Payment</h2>
              <p>Some features of the Service may require a paid subscription. If you purchase a subscription:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>Payments are processed securely through Stripe</li>
                <li>Subscriptions renew automatically unless cancelled before the renewal date</li>
                <li>You may cancel your subscription at any time through your account settings</li>
                <li>Refunds are handled on a case-by-case basis at our discretion</li>
                <li>We reserve the right to change pricing with 30 days' notice</li>
              </ul>
              <p class="mt-2">Free tier users have access to core site-building features with certain usage limits (e.g., number of services, enquiry volume). All site customisation features — including the page builder, templates, gradients, background images, fonts, and layouts — are available on all tiers.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">9. Payment Links</h2>
              <p>The Service allows you to add Stripe payment links to your public page. You acknowledge that:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>You are responsible for creating and managing your own Stripe account and payment links</li>
                <li>BusinessFlow Studio does not process, store, or handle payment card data</li>
                <li>All payment transactions are between you and your customers, facilitated by Stripe</li>
                <li>You must comply with Stripe's terms of service and all applicable payment regulations</li>
                <li>We are not liable for payment disputes, chargebacks, or failed transactions</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">10. Intellectual Property</h2>
              <p>The Service, including its design, code, features, and branding (excluding User Content), is owned by BusinessFlow Studio and protected by intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">11. Disclaimers</h2>
              <p>The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>
              <p class="mt-2">We do not warrant that:</p>
              <ul class="list-disc pl-5 mt-2 space-y-1">
                <li>The Service will be uninterrupted, secure, or error-free</li>
                <li>Results obtained from the Service will be accurate or reliable</li>
                <li>Any defects in the Service will be corrected</li>
              </ul>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">12. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, BusinessFlow Studio shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising from your use of the Service.</p>
              <p class="mt-2">Our total liability for any claim arising from or related to the Service shall not exceed the amount you have paid us in the 12 months preceding the claim, or $100, whichever is greater.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">13. Indemnification</h2>
              <p>You agree to indemnify and hold harmless BusinessFlow Studio from any claims, damages, losses, or expenses (including legal fees) arising from your use of the Service, your User Content, or your violation of these Terms.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">14. Changes to Terms</h2>
              <p>We may update these Terms from time to time. We will notify you of material changes by posting the updated Terms on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the new Terms.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">15. Governing Law</h2>
              <p>These Terms shall be governed by and construed in accordance with applicable law, without regard to conflict of law principles. Any disputes arising from these Terms or your use of the Service shall be resolved through good-faith negotiation first, and if necessary, through binding arbitration or the courts of competent jurisdiction.</p>
            </section>

            <section>
              <h2 class="text-lg font-bold text-gray-900 mb-3">16. Contact Us</h2>
              <p>If you have questions about these Terms, contact us at:</p>
              <p class="mt-2 font-medium text-gray-900">BusinessFlow Studio<br>Email: legal&#64;businessflow.studio</p>
            </section>
          </div>
        </div>
      </main>
    </div>
  `
})
export class TermsComponent {}
