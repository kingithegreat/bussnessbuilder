import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AiService } from './ai.service';
import { AuthService } from './auth.service';
import { DataService } from './data.service';
import { ToastService } from './toast.service';
import { BusinessProfile } from './types';

const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent }; } }));

describe('AI fallback disclosure', () => {
  const post = vi.fn();
  const info = vi.fn();
  let service: AiService;
  const profile: BusinessProfile = {
    name: 'Garden Care', type: 'lawn mowing', serviceArea: 'Auckland', tagline: '', toneOfVoice: 'friendly',
    description: '', email: '', phone: '', address: '', openingHours: '', brandColor: '', heroCopy: '',
    ctaText: '', trustBadges: [], enquiryFields: [],
  };

  beforeEach(() => {
    post.mockReset();
    info.mockReset();
    generateContent.mockReset();
    TestBed.configureTestingModule({ providers: [
      { provide: HttpClient, useValue: { post } },
      { provide: AuthService, useValue: { getIdToken: async () => 'test-token', currentUser: () => ({ uid: 'owner' }) } },
      { provide: DataService, useValue: { geminiApiKey: () => '' } },
      { provide: ToastService, useValue: { info } },
    ] });
    service = TestBed.inject(AiService);
    // Isolate the server path even if a developer's shell has a real BYOK key.
    vi.spyOn(service as unknown as { resolveApiKey(): string }, 'resolveApiKey').mockReturnValue('');
  });

  it('still supplies usable template content and displays the server budget notice', async () => {
    post.mockReturnValue(of({ text: null, fallback: true, message: 'Daily AI allowance reached. Template content is shown.' }));
    const text = await service.generateBusinessDescription(profile);
    expect(text).toContain('Garden Care');
    expect(info).toHaveBeenCalledWith('Daily AI allowance reached. Template content is shown.');
    expect(post).toHaveBeenCalledWith('/api/ai/generate', expect.objectContaining({ uid: 'owner' }), expect.anything());
  });

  it('returns successful AI output without a template warning', async () => {
    post.mockReturnValue(of({ text: 'Your garden, expertly maintained.' }));
    const text = await service.generateBusinessDescription(profile);
    expect(text).toBe('Your garden, expertly maintained.');
    expect(info).not.toHaveBeenCalled();
  });

  it('caps user-owned-key output without charging a platform allowance', async () => {
    vi.spyOn(service as unknown as { resolveApiKey(): string }, 'resolveApiKey').mockReturnValue('user-owned-test-key');
    generateContent.mockResolvedValue({ text: 'Fresh garden copy.' });
    expect(await service.generateBusinessDescription(profile)).toBe('Fresh garden copy.');
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      config: expect.objectContaining({ maxOutputTokens: 2048, thinkingConfig: { thinkingBudget: 0 } }),
    }));
    expect(post).not.toHaveBeenCalled();
  });
});
