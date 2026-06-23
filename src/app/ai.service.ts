import { Injectable } from '@angular/core';
import { BusinessProfile, Enquiry, Service, BusinessType } from './types';
import { getPreset } from './presets';

@Injectable({ providedIn: 'root' })
export class AiService {
  
  async generateBusinessDescription(profile: BusinessProfile): Promise<string> {
    // Simulated delay
    await new Promise(r => setTimeout(r, 1500));
    const preset = getPreset(profile.type as BusinessType);
    const desc = preset ? preset.description : `We are a top-tier ${profile.type} dedicated to providing excellent service in the ${profile.serviceArea} area.`;
    return `Welcome to ${profile.name}! ${desc} ${profile.tagline}. Our goal is to make your life easier through professional, reliable, and high-quality solutions.`;
  }

  async generateDraftReply(enquiry: Enquiry, profile: BusinessProfile): Promise<string> {
    await new Promise(r => setTimeout(r, 1200));
    return `Hi ${enquiry.name},\n\nThank you for reaching out to ${profile.name} regarding "${enquiry.serviceInterest}". We have received your message and would love to help you out.\n\nRegarding your preferred time of ${enquiry.preferredDateTime}, we will check our schedule and get back to you shortly to confirm.\n\nBest regards,\nThe team at ${profile.name}`;
  }

  getPresetServices(type: string): Service[] {
    const preset = getPreset(type as BusinessType);
    return preset?.suggestedServices || [{ id: '1', name: 'Standard Service', description: 'Our flagship offering tailored to your needs.' }];
  }

  async generateGooglePost(profile: BusinessProfile, topic: string): Promise<string> {
    await new Promise(r => setTimeout(r, 1200));
    return `Update from ${profile.name}! 🌟\n\n${topic}\n\nWe are proud to serve the ${profile.serviceArea} area. Call us today at ${profile.phone} or visit our website to learn more!\n\n#${profile.type.replace(/\s+/g, '')} #${profile.serviceArea.replace(/\s+/g, '')} #LocalBusiness`;
  }

  async generateSocialCaption(profile: BusinessProfile, topic: string): Promise<string> {
    await new Promise(r => setTimeout(r, 1200));
    return `Hey everyone! 👋 ${topic}\n\nAt ${profile.name}, we believe in providing the best ${profile.type} services in town. Drop a comment below if you have any questions, or DM us to book! ✨👇\n\n#${profile.type.replace(/\s+/g, '')} #SmallBusiness #LocalServices`;
  }
}
