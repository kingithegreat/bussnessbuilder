import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BusinessProfile, Enquiry, Service, FAQ, BusinessType, ReplyIntent, MarketingContentType, GrowthReport, DraftRecommendationResponse } from './types';
import { getPreset } from './presets';
import { DataService } from './data.service';
import { AuthService } from './auth.service';

const MODEL = 'gemini-2.5-flash';

/**
 * AI content generation backed by Google Gemini.
 *
 * A Gemini API key can be supplied at runtime via the AI Tools settings (stored
 * in the browser) or injected at build/host time as `GEMINI_API_KEY`. When no key
 * is configured — or a request fails — every method gracefully falls back to a
 * deterministic template so the app keeps working offline.
 */
@Injectable({ providedIn: 'root' })
export class AiService {
  private dataService = inject(DataService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  /** True when a Gemini API key is configured and live calls will be attempted. */
  isLive(): boolean {
    return !!this.resolveApiKey();
  }

  private resolveApiKey(): string {
    const userKey = this.dataService.geminiApiKey();
    if (userKey) return userKey;
    // Optional host/build-time key (e.g. AI Studio, or a window global).
    const g = globalThis as unknown as {
      GEMINI_API_KEY?: string;
      process?: { env?: Record<string, string | undefined> };
    };
    return g.GEMINI_API_KEY || g.process?.env?.['GEMINI_API_KEY'] || '';
  }

  private async generate(prompt: string, system?: string): Promise<string | null> {
    const apiKey = this.resolveApiKey();

    // 1. If client-side API key exists, use Gemini SDK directly
    if (apiKey) {
      try {
        // Lazy-loaded so the SDK only ships in a separate chunk fetched on first use.
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        const res = await ai.models.generateContent({
          model: MODEL,
          contents: prompt,
          ...(system ? { config: { systemInstruction: system } } : {}),
        });
        const text = res.text?.trim();
        return text || null;
      } catch (err) {
        console.error('Gemini request failed, falling back to template:', err);
        return null;
      }
    }

    // 2. No client key — try the server-side AI endpoint
    try {
      const token = await this.authService.getIdToken();
      if (!token) return null;
      const uid = this.authService.currentUser()?.uid;
      const res = await firstValueFrom(
        this.http.post<{ text: string }>('/api/ai/generate', {
          uid,
          prompt,
          systemPrompt: system,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      return res?.text?.trim() || null;
    } catch (err) {
      console.error('Server AI request failed, falling back to template:', err);
      return null;
    }
  }

  async generateBusinessDescription(profile: BusinessProfile): Promise<string> {
    const ai = await this.generate(
      `Write a warm, professional 2-3 sentence "About Us" description for this business.
Name: ${profile.name}
Type: ${profile.type}
Tagline: ${profile.tagline}
Service area: ${profile.serviceArea}
Tone of voice: ${profile.toneOfVoice}
Return only the description text — no headings, labels, or surrounding quotes.`,
      'You are an expert small-business copywriter. Write concise, conversion-focused marketing copy.'
    );
    if (ai) return ai;

    const preset = getPreset(profile.type as BusinessType);
    const desc = preset
      ? preset.description
      : `We are a top-tier ${profile.type} dedicated to providing excellent service in the ${profile.serviceArea} area.`;
    return `Welcome to ${profile.name}! ${desc} ${profile.tagline}. Our goal is to make your life easier through professional, reliable, and high-quality solutions.`;
  }

  async generateDraftReply(enquiry: Enquiry, profile: BusinessProfile): Promise<string> {
    const ai = await this.generate(
      `Draft a friendly, professional email reply to a customer enquiry on behalf of the business.
Business name: ${profile.name}
Business tone of voice: ${profile.toneOfVoice}
Customer name: ${enquiry.name}
Service of interest: ${enquiry.serviceInterest}
Preferred time: ${enquiry.preferredDateTime || 'not specified'}
Customer message: "${enquiry.message}"
Acknowledge their request, address their preferred time, and offer a clear next step. Sign off as "The team at ${profile.name}". Return only the email body.`,
      'You are a helpful customer-service assistant for a small business. Write warm, concise replies.'
    );
    if (ai) return ai;

    return `Hi ${enquiry.name},\n\nThank you for reaching out to ${profile.name} regarding "${enquiry.serviceInterest}". We have received your message and would love to help you out.\n\nRegarding your preferred time of ${enquiry.preferredDateTime}, we will check our schedule and get back to you shortly to confirm.\n\nBest regards,\nThe team at ${profile.name}`;
  }

  getPresetServices(type: string): Service[] {
    const preset = getPreset(type as BusinessType);
    return preset?.suggestedServices || [{ id: '1', name: 'Standard Service', description: 'Our flagship offering tailored to your needs.' }];
  }

  async generateGooglePost(profile: BusinessProfile, topic: string): Promise<string> {
    const ai = await this.generate(
      `Write a short Google Business Profile post (under 1500 characters) for ${profile.name}, a ${profile.type} serving ${profile.serviceArea}.
Topic: ${topic}
Tone of voice: ${profile.toneOfVoice}
Include a clear call to action${profile.phone ? ` and the phone number ${profile.phone}` : ''}, plus 2-3 relevant hashtags. Return only the post text.`,
      'You are a local-SEO and social media expert writing engaging Google Business posts.'
    );
    if (ai) return ai;

    return `Update from ${profile.name}! 🌟\n\n${topic}\n\nWe are proud to serve the ${profile.serviceArea} area. Call us today at ${profile.phone} or visit our website to learn more!\n\n#${profile.type.replace(/\s+/g, '')} #${profile.serviceArea.replace(/\s+/g, '')} #LocalBusiness`;
  }

  async generateSocialCaption(profile: BusinessProfile, topic: string): Promise<string> {
    const ai = await this.generate(
      `Write an engaging Facebook/Instagram caption for ${profile.name}, a ${profile.type}.
Topic: ${topic}
Tone of voice: ${profile.toneOfVoice}
Keep it upbeat, encourage comments or DMs to book, and include 3-4 relevant hashtags and a couple of emojis. Return only the caption text.`,
      'You are a social media manager who writes fun, high-engagement captions for small businesses.'
    );
    if (ai) return ai;

    return `Hey everyone! 👋 ${topic}\n\nAt ${profile.name}, we believe in providing the best ${profile.type} services in town. Drop a comment below if you have any questions, or DM us to book! ✨👇\n\n#${profile.type.replace(/\s+/g, '')} #SmallBusiness #LocalServices`;
  }

  async generateLeadReply(enquiry: Enquiry, profile: BusinessProfile, intent: ReplyIntent): Promise<string> {
    const prompts: Record<ReplyIntent, string> = {
      'reply': `Draft a friendly, professional email reply to a customer enquiry.
Acknowledge their request, address their preferred time, and offer a clear next step.`,
      'followup': `Draft a friendly follow-up email to a customer who enquired but hasn't responded.
Be warm, not pushy. Remind them of their interest and offer to answer questions.`,
      'quote': `Draft a professional quote/estimate response to a customer enquiry.
Include a warm greeting, reference their specific service interest, mention that this is an estimate, and invite them to book.`,
      'close-lost': `Draft a polite close-out email to a customer who is no longer interested.
Thank them for considering the business, leave the door open for future contact, and wish them well.`,
      'booking-confirmation': `Draft a booking confirmation email to a customer.
Confirm their service interest, mention the preferred time, include any preparation instructions, and express excitement about working with them.`,
    };

    const ai = await this.generate(
      `${prompts[intent]}
Business name: ${profile.name}
Business type: ${profile.type}
Business tone of voice: ${profile.toneOfVoice}
Customer name: ${enquiry.name}
Service of interest: ${enquiry.serviceInterest}
Preferred time: ${enquiry.preferredDateTime || 'not specified'}
Customer message: "${enquiry.message}"
Current lead status: ${enquiry.status}
Sign off as "The team at ${profile.name}". Return only the email body.`,
      'You are a helpful customer-service assistant for a small business. Write warm, concise replies.'
    );
    if (ai) return ai;

    const templates: Record<ReplyIntent, string> = {
      'reply': `Hi ${enquiry.name},\n\nThank you for reaching out to ${profile.name} regarding "${enquiry.serviceInterest}". We'd love to help!\n\n${enquiry.preferredDateTime ? `We'll check our availability for ${enquiry.preferredDateTime} and get back to you shortly.` : 'Please let us know your preferred time and we will do our best to accommodate.'}\n\nBest regards,\nThe team at ${profile.name}`,
      'followup': `Hi ${enquiry.name},\n\nWe wanted to follow up on your enquiry about "${enquiry.serviceInterest}". We'd love to help you with this.\n\nDo you have any questions we can answer? We're happy to provide more details or schedule a time that works for you.\n\nBest regards,\nThe team at ${profile.name}`,
      'quote': `Hi ${enquiry.name},\n\nThank you for your interest in our ${enquiry.serviceInterest} service. Based on your requirements, here's our estimate:\n\n[Service details and pricing here]\n\nThis is an initial estimate — we're happy to discuss and adjust based on your specific needs. Would you like to go ahead and book?\n\nBest regards,\nThe team at ${profile.name}`,
      'close-lost': `Hi ${enquiry.name},\n\nThank you for considering ${profile.name} for your ${enquiry.serviceInterest} needs. We understand this wasn't the right fit at this time.\n\nIf your needs change in the future, we'd be happy to hear from you. Wishing you all the best!\n\nWarm regards,\nThe team at ${profile.name}`,
      'booking-confirmation': `Hi ${enquiry.name},\n\nGreat news! Your ${enquiry.serviceInterest} booking is confirmed${enquiry.preferredDateTime ? ` for ${enquiry.preferredDateTime}` : ''}.\n\nWe're looking forward to working with you. If you need to make any changes, just let us know.\n\nBest regards,\nThe team at ${profile.name}`,
    };

    return templates[intent];
  }

  async generateMarketingContent(profile: BusinessProfile, services: Service[], contentType: MarketingContentType, topic?: string): Promise<string> {
    const serviceList = services.map(s => s.name).join(', ');
    const prompts: Record<MarketingContentType, { prompt: string; system: string; fallback: string }> = {
      'facebook': {
        prompt: `Write an engaging Facebook post for ${profile.name}, a ${profile.type} serving ${profile.serviceArea}.\nServices: ${serviceList}\n${topic ? `Topic: ${topic}` : 'Write about what makes the business special.'}\nTone: ${profile.toneOfVoice}\nInclude a call-to-action, 2-3 emojis, and 3 hashtags. Keep under 300 words.`,
        system: 'You are a social media marketing expert for small businesses.',
        fallback: `🌟 Looking for a trusted ${profile.type} in ${profile.serviceArea}?\n\n${profile.name} is here to help! We offer ${serviceList}.\n\n${topic || 'Contact us today for a free quote!'}\n\n📞 ${profile.phone || 'Call us'}\n\n#${(profile.type || '').replace(/\s+/g, '')} #${(profile.serviceArea || '').replace(/\s+/g, '')} #SmallBusiness`,
      },
      'instagram': {
        prompt: `Write an Instagram caption for ${profile.name}, a ${profile.type}.\nServices: ${serviceList}\n${topic ? `Topic: ${topic}` : 'Showcase the business.'}\nTone: ${profile.toneOfVoice}\nMake it visual and engaging, use emojis, include 5-8 hashtags. Keep under 200 words.`,
        system: 'You are an Instagram content creator for small businesses.',
        fallback: `✨ ${profile.name} — your local ${profile.type} ✨\n\n${topic || `We specialise in ${serviceList}.`}\n\nDM us or visit the link in bio to book! 📩\n\n#${(profile.type || '').replace(/\s+/g, '')} #SmallBusiness #LocalServices #BookNow`,
      },
      'google-business': {
        prompt: `Write a Google Business Profile update post for ${profile.name}, a ${profile.type} in ${profile.serviceArea}.\nServices: ${serviceList}\n${topic ? `Topic: ${topic}` : 'General business update.'}\nTone: ${profile.toneOfVoice}\nKeep under 1500 characters. Include a call to action${profile.phone ? ` with phone number ${profile.phone}` : ''}.`,
        system: 'You are a local SEO expert writing Google Business Profile posts.',
        fallback: `Update from ${profile.name}!\n\n${topic || `We're proud to serve ${profile.serviceArea} with quality ${profile.type} services.`}\n\nServices: ${serviceList}\n\n${profile.phone ? `Call us at ${profile.phone}` : 'Contact us today!'}\n\n#LocalBusiness`,
      },
      'review-request': {
        prompt: `Write a friendly message asking a satisfied customer to leave a review for ${profile.name}, a ${profile.type}.\nTone: ${profile.toneOfVoice}\nMake it personal, not automated. Explain how reviews help small businesses. Keep it short (under 100 words). Suggest Google or Facebook as review platforms.`,
        system: 'You are a customer relationship expert helping small businesses get more reviews.',
        fallback: `Hi [Customer Name],\n\nThank you for choosing ${profile.name}! We hope you were happy with our service.\n\nIf you have a moment, we'd really appreciate a quick review on Google. It makes a huge difference for small businesses like ours.\n\nThank you so much!\nThe team at ${profile.name}`,
      },
      'service-promo': {
        prompt: `Write a promotional message for ${profile.name} highlighting their services: ${serviceList}.\n${topic ? `Focus on: ${topic}` : 'Promote the most popular service.'}\nTone: ${profile.toneOfVoice}\nInclude urgency or a special offer angle. Keep under 200 words. Include a call-to-action.`,
        system: 'You are a small business marketing copywriter specialising in service promotions.',
        fallback: `🔥 Special from ${profile.name}!\n\n${topic || `Check out our ${services[0]?.name || 'services'} — trusted by customers across ${profile.serviceArea}.`}\n\nBook now and experience the difference. Limited availability!\n\n📞 ${profile.phone || 'Contact us today'}`,
      },
      'seasonal-offer': {
        prompt: `Write a seasonal marketing message for ${profile.name}, a ${profile.type} in ${profile.serviceArea}.\nServices: ${serviceList}\n${topic ? `Season/occasion: ${topic}` : 'Current season.'}\nTone: ${profile.toneOfVoice}\nTie the offer to the season or time of year. Include urgency. Keep under 200 words.`,
        system: 'You are a seasonal marketing expert for small service businesses.',
        fallback: `🌸 Seasonal special from ${profile.name}!\n\n${topic || 'This season'} is the perfect time to book our ${services[0]?.name || 'services'}.\n\nDon't miss out — spots fill fast!\n\n📞 ${profile.phone || 'Book now'}`,
      },
    };

    const config = prompts[contentType];
    const ai = await this.generate(config.prompt, config.system);
    return ai || config.fallback;
  }

  async draftRecommendation(recommendation: { title: string; type: string; suggestion: string }): Promise<DraftRecommendationResponse | null> {
    try {
      const token = await this.authService.getIdToken();
      if (!token) return null;
      const uid = this.authService.currentUser()?.uid;
      const res = await firstValueFrom(
        this.http.post<DraftRecommendationResponse>('/api/ai/draft-recommendation', {
          uid,
          recommendation,
        }, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      return res || null;
    } catch (err) {
      console.error('Draft recommendation failed:', err);
      return null;
    }
  }

  async generateGrowthReport(): Promise<GrowthReport | null> {
    try {
      const token = await this.authService.getIdToken();
      if (!token) return null;
      const uid = this.authService.currentUser()?.uid;
      const res = await firstValueFrom(
        this.http.post<GrowthReport>('/api/ai/growth-report', { uid }, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      return res || null;
    } catch (err) {
      console.error('Growth report generation failed:', err);
      return null;
    }
  }

  // ── AI Content Generation — Services & FAQs ──────────────────────────────

  getPresetFaqs(type: string): FAQ[] {
    const preset = getPreset(type as BusinessType);
    return preset?.suggestedFaqs || [
      { id: 'f1', question: 'Do you offer free consultations?', answer: 'Yes, we offer a free 15-minute consultation to discuss your needs.' },
      { id: 'f2', question: 'What areas do you service?', answer: 'We serve the local area and surrounds. Contact us to confirm your location.' },
    ];
  }

  /**
   * Generate a list of 3–5 suggested services for the business.
   * Tries Gemini first; falls back to business-type presets.
   */
  async generateServices(profile: BusinessProfile): Promise<Service[]> {
    const ai = await this.generate(
      `You are helping a small business owner set up their website. Generate exactly 3 service offerings for this business.

Business name: ${profile.name}
Business type: ${profile.type}
Description: ${profile.description}
Tone of voice: ${profile.toneOfVoice || 'professional'}

Return a JSON array of exactly 3 objects with keys: name (string), description (1-2 sentences, string), price (realistic estimate with currency symbol, string).
Return ONLY the JSON array — no markdown, no explanation, no code fences.`,
    );

    if (ai) {
      try {
        const parsed = JSON.parse(ai.trim().replace(/^```json?
?|```$/g, ''));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: any, i: number) => ({
            id: `ai-svc-${Date.now()}-${i}`,
            name: String(s.name || 'Unnamed Service'),
            description: String(s.description || ''),
            price: s.price ? String(s.price) : undefined,
          })) as Service[];
        }
      } catch {
        // fall through to preset
      }
    }

    return this.getPresetServices(profile.type).map(s => ({
      ...s,
      id: `preset-svc-${Date.now()}-${s.id}`,
    }));
  }

  /**
   * Generate 3–5 FAQs tailored to the business and its services.
   * Tries Gemini first; falls back to business-type presets.
   */
  async generateFAQs(profile: BusinessProfile, services: Service[]): Promise<FAQ[]> {
    const serviceList = services.map(s => s.name).join(', ') || 'general services';
    const ai = await this.generate(
      `Generate 4 realistic FAQs (Frequently Asked Questions) for a small business website.

Business name: ${profile.name}
Business type: ${profile.type}
Services offered: ${serviceList}
Service area: ${profile.serviceArea || 'local area'}
Tone of voice: ${profile.toneOfVoice || 'professional'}

Think about what customers actually want to know before booking — pricing, process, qualifications, availability.
Return a JSON array of exactly 4 objects with keys: question (string), answer (1-2 sentences, string).
Return ONLY the JSON array — no markdown, no explanation, no code fences.`,
    );

    if (ai) {
      try {
        const parsed = JSON.parse(ai.trim().replace(/^```json?
?|```$/g, ''));
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((f: any, i: number) => ({
            id: `ai-faq-${Date.now()}-${i}`,
            question: String(f.question || ''),
            answer: String(f.answer || ''),
          })) as FAQ[];
        }
      } catch {
        // fall through to preset
      }
    }

    return this.getPresetFaqs(profile.type).map(f => ({
      ...f,
      id: `preset-faq-${Date.now()}-${f.id}`,
    }));
  }

}
