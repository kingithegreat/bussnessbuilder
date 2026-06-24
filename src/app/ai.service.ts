import { Injectable, inject } from '@angular/core';
import { BusinessProfile, Enquiry, Service, BusinessType } from './types';
import { getPreset } from './presets';
import { DataService } from './data.service';

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
    if (!apiKey) return null;
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
}
