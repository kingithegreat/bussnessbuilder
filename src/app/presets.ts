import { BusinessType, Service, FAQ } from './types';

export interface BusinessPreset {
  id: BusinessType;
  label: string;
  description: string;
  suggestedServices: Service[];
  suggestedFaqs: FAQ[];
  suggestedEnquiryFields: string[];
  suggestedHeroCopy: string;
  suggestedCtaText: string;
  suggestedTone: string;
  trustBadges: string[];
}

export const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: 'cleaner',
    label: 'Cleaning Service',
    description: 'Residential and commercial cleaning businesses.',
    suggestedServices: [
      { id: 'c1', name: 'Standard Clean', description: 'Regular maintenance cleaning for your home.', price: '$120' },
      { id: 'c2', name: 'Deep Clean', description: 'Thorough top-to-bottom cleaning including baseboards and inside cabinets.', price: '$250' },
      { id: 'c3', name: 'Move In/Out', description: 'Detailed cleaning for empty homes to prepare for new occupants.', price: '$300' }
    ],
    suggestedFaqs: [
      { id: 'f1', question: 'Do I need to provide cleaning supplies?', answer: 'No, we bring our own professional-grade supplies and equipment.' },
      { id: 'f2', question: 'Are your cleaners insured?', answer: 'Yes, all our staff are fully bonded and insured for your peace of mind.' }
    ],
    suggestedEnquiryFields: ['Property Size (sq ft)', 'Number of Bedrooms', 'Number of Bathrooms'],
    suggestedHeroCopy: 'Spotless cleaning for a healthier, happier home.',
    suggestedCtaText: 'Get a Free Estimate',
    suggestedTone: 'Professional, trustworthy, and detail-oriented',
    trustBadges: ['Fully Insured', 'Eco-Friendly Products', 'Satisfaction Guarantee']
  },
  {
    id: 'barber',
    label: 'Barbershop / Salon',
    description: 'Haircuts, styling, and grooming services.',
    suggestedServices: [
      { id: 'b1', name: 'Classic Haircut', description: 'Tailored haircut with a straight razor neck shave.', price: '$40' },
      { id: 'b2', name: 'Beard Trim & Line Up', description: 'Expert beard shaping and hot towel treatment.', price: '$25' },
      { id: 'b3', name: 'The Full Works', description: 'Haircut, beard trim, and relaxing scalp massage.', price: '$60' }
    ],
    suggestedFaqs: [
      { id: 'f1', question: 'Do you take walk-ins?', answer: 'We prefer appointments, but walk-ins are welcome if we have availability.' },
      { id: 'f2', question: 'How long does a typical haircut take?', answer: 'A standard haircut takes about 30-45 minutes to ensure attention to detail.' }
    ],
    suggestedEnquiryFields: ['Preferred Barber', 'Hair Type'],
    suggestedHeroCopy: 'Look sharp. Feel confident. Expert grooming tailored to you.',
    suggestedCtaText: 'Book an Appointment',
    suggestedTone: 'Welcoming, stylish, and relaxed',
    trustBadges: ['Licensed Professionals', 'Premium Products', 'Top Rated']
  },
  {
    id: 'personal trainer',
    label: 'Personal Trainer',
    description: 'Fitness coaching, workout plans, and nutrition advice.',
    suggestedServices: [
      { id: 'pt1', name: '1-on-1 Training Session', description: '60 minutes of personalized fitness coaching.', price: '$80' },
      { id: 'pt2', name: 'Monthly Coaching Plan', description: 'Custom workout programs and weekly check-ins.', price: '$200/mo' },
      { id: 'pt3', name: 'Small Group Training', description: 'Train with up to 3 friends for a fun, motivating workout.', price: '$40/person' }
    ],
    suggestedFaqs: [
      { id: 'f1', question: 'Do I need a gym membership?', answer: 'Not necessarily! I can train you at your home, a local park, or my private studio.' },
      { id: 'f2', question: 'Do you provide meal plans?', answer: 'Yes, I offer nutritional guidance to complement your training goals.' }
    ],
    suggestedEnquiryFields: ['Fitness Goals', 'Current Fitness Level', 'Any Injuries?'],
    suggestedHeroCopy: 'Transform your body and mind with personalized fitness coaching.',
    suggestedCtaText: 'Start Your Journey',
    suggestedTone: 'Motivating, energetic, and supportive',
    trustBadges: ['Certified Trainer', 'CPR/AED Certified', 'Proven Results']
  },
  {
    id: 'tutor',
    label: 'Tutor / Instructor',
    description: 'Academic tutoring, music lessons, or skill instruction.',
    suggestedServices: [
      { id: 't1', name: 'Online Tutoring (1 Hour)', description: 'One-on-one virtual session via Zoom.', price: '$50' },
      { id: 't2', name: 'In-Person Tutoring', description: 'At-home or library sessions for focused learning.', price: '$70' },
      { id: 't3', name: 'Test Prep Package', description: 'Intensive 10-hour prep course for upcoming exams.', price: '$450' }
    ],
    suggestedFaqs: [
      { id: 'f1', question: 'What subjects do you teach?', answer: 'I specialize in Mathematics (up to Calculus) and High School Physics.' },
      { id: 'f2', question: 'Can we schedule regular weekly sessions?', answer: 'Absolutely. Most students benefit from a consistent weekly schedule.' }
    ],
    suggestedEnquiryFields: ['Subject/Skill Needed', 'Student Grade Level', 'Current Struggles'],
    suggestedHeroCopy: 'Unlock your full potential with expert, patient instruction.',
    suggestedCtaText: 'Schedule a Consultation',
    suggestedTone: 'Patient, encouraging, and knowledgeable',
    trustBadges: ['Background Checked', 'Degree Certified', 'Flexible Scheduling']
  },
  {
    id: 'lawn mowing',
    label: 'Lawn Care & Landscaping',
    description: 'Mowing, trimming, and garden maintenance.',
    suggestedServices: [
      { id: 'l1', name: 'Weekly Mowing', description: 'Mowing, edging, and blowing driveways/walkways clear.', price: '$45/visit' },
      { id: 'l2', name: 'Seasonal Cleanup', description: 'Leaf removal, branch clearing, and garden bed prep.', price: '$150' },
      { id: 'l3', name: 'Mulch Installation', description: 'Delivery and spreading of premium mulch.', price: '$75/yard' }
    ],
    suggestedFaqs: [
      { id: 'f1', question: 'Do I need to be home for the service?', answer: 'No, as long as we have access to the yard and gates are unlocked.' },
      { id: 'f2', question: 'What if it rains?', answer: 'We will reschedule for the next available dry day at no extra cost.' }
    ],
    suggestedEnquiryFields: ['Lawn Size (Approx)', 'Frequency Needed', 'Fenced Yard?'],
    suggestedHeroCopy: 'Lush, beautiful lawns without the weekend work.',
    suggestedCtaText: 'Get a Lawn Quote',
    suggestedTone: 'Reliable, hardworking, and friendly',
    trustBadges: ['Local Business', 'Fully Equipped', 'Dependable Service']
  }
];

export function getPreset(type: BusinessType): BusinessPreset | undefined {
  return BUSINESS_PRESETS.find(p => p.id === type);
}
