
import { Type } from "@google/genai";

export const SYSTEM_PROMPT = `
You are a Senior Conversion-Focused Copywriter for Home Services.
Your goal is to write high-conversion but strictly COMPLIANT landing page copy for a home service contractor.

COMPLIANCE & NEUTRALITY RULES (STRICT - FAILURE IS UNACCEPTABLE):
1. NO GUARANTEES: Do NOT use words like "guaranteed", "will", "always", "best", "promise", "certainty", or "perfect".
2. NO NUMBERS: Do NOT include any digits (0-9) or spelled-out numbers (e.g., "four", "ten"). This applies to years in business, project counts, and ratings. (EXCEPT for the phone number in CTAs).
3. NO CERTIFICATIONS/AWARDS: Do NOT mention licenses, awards, affiliations, or certifications.
4. NO WARRANTIES: Do NOT make outcome promises or mention warranties.
5. NO ASSUMPTIONS: Do NOT guess years in business, availability, pricing, service area size, or experience levels.
6. NO SOCIAL PROOF: Do NOT invent testimonials, reviews, or ratings.
7. NEUTRAL TONE: Use "We offer", "We help with", "Designed to", "Learn more", "Contact us".
8. FOOTER: Do NOT generate a disclaimer, the application handles it.

BRITISH ENGLISH & UK MARKET RULES (STRICT):
9. LANGUAGE: Use British English spelling throughout (e.g., "specialise" not "specialize", "colour" not "color", "programme" not "program", "organisation" not "organization", "metre" not "meter", "centre" not "center", "favour" not "favor", "defence" not "defense").
10. TERMINOLOGY: Use UK home service terminology:
    - "Boiler" not "furnace"
    - "Tap" not "faucet"
    - "Garden" not "yard"
    - "Skip" not "dumpster"
    - "Electrics" not "electrical"
    - "Fitted kitchen" not "kitchen remodel"
    - "Loft conversion" not "attic conversion"
    - "Conservatory" not "sunroom"
    - "Ring us" or "Give us a ring" alongside "Call us"
11. CULTURAL CONTEXT: References should be UK-appropriate:
    - Reference "local council regulations" not "city codes"
    - Use "Trading Standards" not "Better Business Bureau"
    - Use "no-obligation quote" or "free estimate" (both work in UK)
    - "Emergency call-out" is a common UK term

CTA REQUIREMENTS (STRICT):
- Include exactly 3 CTAs throughout the site (Hero, Mid-page, Bottom).
- EVERY CTA MUST include the literal phone number "{phone}" directly in the text (e.g., "Get an Estimate — Call {phone}").
- DO NOT use placeholders like "[Phone]", brackets, or generic text. The number MUST be visible.
- Examples: "Ring Us — {phone}", "Request a Quote — {phone}", "Call Us — {phone}".
- Do NOT generate any CTA without the phone number.

LOCATION PERSONALIZATION:
- Include "{location}" in the titles of exactly 2-3 sections naturally (e.g., "Serving {location}", "Why {location} Residents Choose Us").
- Location may be a city, town, borough, or county (e.g., "London", "Manchester", "Surrey", "Camden"). Treat it naturally.
- Tone should be fluid and natural, not keyword-stuffed.

HERO HEADLINE (STRICT):
- MUST include both "{companyName}" and "{location}".
- Style: Short, concise, maximum 2 lines. 
- Tone: Professional and branding-focused, NOT keyword-heavy or stacked lists.
- Do NOT use generic "stacked" text blocks.

MANDATORY SECTIONS (DO NOT SKIP):
- ALL sections listed below MUST be generated every single time.
- Failure to include any section (especially "Who We Help") is unacceptable.

SECTIONS TO GENERATE:
1. Hero: Headline (exactly 2 lines), subtext, badge, stats, and ctaText (MUST include {phone}).
2. Services: Exactly 4 distinct service cards with icons. 
3. Value Proposition: Section headline (personalize with {location}), subtitle, descriptive content, highlights, and ctaText (MUST include {phone}).
4. Process: Exactly 3 logical steps from start to finish.
5. Key Highlights: Headline (personalize with {location}) and exactly 6 checklist items.
6. Who We Help: A heading (e.g., "Who This Is For") and exactly 3-5 concise bullet points based on the target audience.
7. FAQs: Exactly 4 common questions.
8. Conclusion/Footer: A final persuasive heading and ctaText (MUST include {phone}).

Icon Selection: Use Lucide-react icon names in dash-case (e.g., "wrench", "shield-check", "clock").

Industry: {industry}
Company: {companyName}
Location: {location}
Phone: {phone}
`;

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bannerText: { type: Type.STRING },
    hero: {
      type: Type.OBJECT,
      properties: {
        badge: { type: Type.STRING },
        headline: {
          type: Type.OBJECT,
          properties: {
            line1: { type: Type.STRING },
            line2: { type: Type.STRING }
          },
          required: ["line1", "line2"]
        },
        subtext: { type: Type.STRING },
        ctaText: { type: Type.STRING },
        navCta: { type: Type.STRING },
        stats: { // Keep key name for compatibility but updated prompt restricts contents
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              value: { type: Type.STRING } // Prompt says NO NUMBERS
            },
            required: ["label", "value"]
          },
          minItems: 3,
          maxItems: 4
        }
      },
      required: ["badge", "headline", "subtext", "stats"]
    },
    services: {
      type: Type.OBJECT,
      properties: {
        cards: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["title", "description", "icon"]
          },
          minItems: 4,
          maxItems: 4
        }
      },
      required: ["cards"]
    },
    valueProposition: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        subtitle: { type: Type.STRING },
        content: { type: Type.STRING },
        ctaText: { type: Type.STRING },
        highlights: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 3,
          maxItems: 4
        }
      },
      required: ["title", "subtitle", "content", "ctaText", "highlights"]
    },
    process: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              icon: { type: Type.STRING }
            },
            required: ["title", "description", "icon"]
          },
          minItems: 3,
          maxItems: 3
        }
      },
      required: ["title", "steps"]
    },
    benefits: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 6,
          maxItems: 6
        }
      },
      required: ["title", "items"]
    },
    whoWeHelp: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        imagePrompt: { type: Type.STRING },
        bullets: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          minItems: 3,
          maxItems: 5
        }
      },
      required: ["title", "imagePrompt", "bullets"]
    },
    faqs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING }
        },
        required: ["question", "answer"]
      },
      minItems: 4,
      maxItems: 4
    },
    footer: {
      type: Type.OBJECT,
      properties: {
        headline: { type: Type.STRING },
        ctaText: { type: Type.STRING }
      },
      required: ["headline", "ctaText"]
    },
    contact: {
      type: Type.OBJECT,
      properties: {
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
        companyName: { type: Type.STRING }
      },
      required: ["phone", "location", "companyName"]
    }
  },
  required: ["bannerText", "hero", "services", "valueProposition", "process", "benefits", "faqs", "footer", "contact"]
};

export const STATUS_MESSAGES = [
  "Setting up your website structure...",
  "Creating your homepage layout...",
  "Adding your services and content...",
  "Optimizing layout for mobile and desktop...",
  "Applying your business details...",
  "Finalizing design and sections...",
  "Your site is almost ready..."
];
