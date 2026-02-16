
export interface ServiceCard {
  title: string;
  description: string;
  icon: string;
}

export interface BenefitCard {
  title: string;
  description: string;
  icon: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface GeneratedSiteData {
  bannerText: string;
  hero: {
    badge: string;
    headline: {
      line1: string;
      line2: string;
    };
    subtext: string;
    ctaText: string;
    navCta: string;
    heroImage: string;
    stats?: {
      label: string;
      value: string;
    }[];
  };
  services: {
    cards: ServiceCard[];
  };
  valueProposition: {
    title: string;
    subtitle: string;
    content: string;
    ctaText: string;
    image: string;
    highlights: string[];
  };
  benefits: {
    title: string;
    items: string[];
  };
  process: {
    title: string;
    steps: {
      title: string;
      description: string;
      icon: string;
    }[];
  };
  whoWeHelp: {
    title: string;
    image: string;
    bullets: string[];
  };
  faqs: FAQItem[];
  footer: {
    headline: string;
    ctaText: string;
  };
  contact: {
    phone: string;
    location: string;
    companyName: string;
  }
}

export interface SiteInstance {
  id: string;
  data: GeneratedSiteData;
  lastSaved: number;
}

export interface GeneratorInputs {
  industry: string;
  companyName: string;
  location: string;
  phone: string;
  brandColor: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_status: 'none' | 'active' | 'past_due' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  session: import('@supabase/supabase-js').Session | null;
  user: import('@supabase/supabase-js').User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
