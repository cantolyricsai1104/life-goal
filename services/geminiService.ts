import { GoogleGenAI, Type } from "@google/genai";
import { LifeAspect } from '../types';

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({ apiKey });
};

export const getGeminiErrorMessage = (error: unknown) => {
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (rawMessage.includes('GEMINI_API_KEY_MISSING') || rawMessage.includes('Missing GEMINI_API_KEY')) {
    return 'Missing GEMINI_API_KEY. Add a new key to .env.local and restart the app.';
  }
  if (rawMessage.includes('leaked') || rawMessage.includes('PERMISSION_DENIED')) {
    return 'Your Gemini API key was revoked. Replace it in .env.local and restart the app.';
  }
  return 'AI is taking a nap. Try again momentarily.';
};

export interface AIHabit {
  title: string;
  duration?: number; // minutes
}

export interface AIPlanResponse {
  title: string;
  description: string;
  aspect: LifeAspect;
  milestones: string[];
  habits: AIHabit[];
  motivationalQuote: string;
}

export const generateGoalPlan = async (userDream: string): Promise<AIPlanResponse> => {
  const modelId = "gemini-3-flash-preview";
  const ai = getClient();
  
  const prompt = `
    The user has a vague dream or goal: "${userDream}".
    Please analyze this and break it down into a concrete, SMART goal plan.
    1. Identify the most relevant Life Aspect from this list: Health, Relationships, Financial, Learning, Career, Spiritual.
    2. Create a concise, inspiring Title for the goal.
    3. Write a short 1-sentence Description.
    4. List 3 key Milestones (achievable sub-goals).
    5. List 2 daily Habits that will help achieve this. If a habit involves a time duration (like meditating, reading, or exercise), specify the recommended duration in minutes.
    6. Provide a short Motivational Quote relevant to this goal.
  `;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          aspect: { 
            type: Type.STRING, 
            enum: [
              'Health', 
              'Relationships', 
              'Financial', 
              'Learning', 
              'Career', 
              'Spiritual'
            ] 
          },
          milestones: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          habits: {
            type: Type.ARRAY,
            items: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                duration: { type: Type.NUMBER, description: "Recommended duration in minutes, if applicable." }
              },
              required: ["title"]
            }
          },
          motivationalQuote: { type: Type.STRING }
        },
        required: ["title", "description", "aspect", "milestones", "habits", "motivationalQuote"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text) as AIPlanResponse;
};

export const getAdviceForGoal = async (goalTitle: string, currentProgress: number): Promise<string> => {
    const modelId = "gemini-3-flash-preview";
    const ai = getClient();
    const prompt = `
      I am currently working on this goal: "${goalTitle}".
      My progress is at ${currentProgress}%.
      Give me one short, punchy paragraph of specific advice to keep moving forward or to overcome the "middle-of-the-road" slump.
      Keep it under 50 words.
    `;

    const response = await ai.models.generateContent({
        model: modelId,
        contents: prompt,
    });

    return response.text || "Keep going, consistency is key!";
}
