
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT, RESPONSE_SCHEMA } from "../constants";
import { GeneratedSiteData, GeneratorInputs } from "../types";

/**
 * Utility to strip markdown code blocks from AI response text
 */
const cleanJsonResponse = (text: string): string => {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
};

export const generateSiteContent = async (inputs: GeneratorInputs): Promise<GeneratedSiteData> => {
  // Always create a new instance right before usage to get the latest environment state
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    // 1. Prepare Prompts
    const textPrompt = SYSTEM_PROMPT
      .replaceAll("{industry}", inputs.industry)
      .replaceAll("{companyName}", inputs.companyName)
      .replaceAll("{location}", inputs.location)
      .replaceAll("{phone}", inputs.phone);

    const imagePromptHero = `Wide establishing shot of a professional ${inputs.industry} team at a job site in ${inputs.location}. Professional uniforms, cinematic lighting, 8k resolution. No text.`;
    const imagePromptValue = `Action shot of a ${inputs.industry} professional performing service. Close-up on tools and expert workmanship, natural lighting, high quality. No text.`;

    const imagePromptWho = `Professional photo of a ${inputs.industry} customer at home, looking happy and satisfied with services provided by ${inputs.companyName} in ${inputs.location}. High quality, natural lighting. No text.`;

    // 2. Generate Text and Images in Parallel
    const [textResponse, heroImgRes, valueImgRes, whoImgRes] = await Promise.all([
      ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: textPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA as any,
        },
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePromptHero }] },
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePromptValue }] },
      }),
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: imagePromptWho }] },
      })
    ]);

    // 3. Process Text Results
    const rawText = textResponse.text || "{}";
    const cleanedText = cleanJsonResponse(rawText);
    const siteData: Partial<GeneratedSiteData> = JSON.parse(cleanedText);

    const extractImage = (response: any) => {
      try {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      } catch (e) {
        console.warn("Failed to extract image, using fallback", e);
      }
      return `https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=1200`;
    };

    // 4. Combine and Sanitize
    if (!siteData.hero) siteData.hero = {} as any;
    if (!siteData.contact) siteData.contact = {} as any;
    if (!siteData.valueProposition) siteData.valueProposition = {} as any;
    if (!siteData.whoWeHelp) siteData.whoWeHelp = {} as any;

    const hero = siteData.hero!;
    const vp = siteData.valueProposition!;
    const wwh = siteData.whoWeHelp!;
    const contact = siteData.contact!;

    hero.heroImage = extractImage(heroImgRes);
    vp.image = extractImage(valueImgRes);
    wwh.image = extractImage(whoImgRes);

    contact.phone = inputs.phone;
    contact.location = inputs.location;
    contact.companyName = inputs.companyName;

    // Initialize empty gallery — user uploads their own work photos
    siteData.gallery = {
      title: 'Our Work',
      subtitle: 'See the quality of our craftsmanship',
      slots: [
        { gcs_url: null, alt: '' },
        { gcs_url: null, alt: '' },
        { gcs_url: null, alt: '' },
      ],
    };

    return siteData as GeneratedSiteData;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Propagate a clean error message if it's a model issue
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Model not found or API key restricted. Please ensure your API key is correctly configured.");
    }
    throw error;
  }
};
