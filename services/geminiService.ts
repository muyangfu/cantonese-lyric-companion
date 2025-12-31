
import { GoogleGenAI, Type } from "@google/genai";
import { LyricLine } from "../types";

export const fetchCantoneseData = async (text: string): Promise<LyricLine[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Act as a linguistic expert in Cantonese (Guangdong dialect). 
      Convert the following lyrics into a structured JSON format.
      For each Chinese character, provide its standard Jyutping (Cantonese romanization) and a "Mandarin Homophone" (a Mandarin character that sounds similar to the Cantonese pronunciation for non-Cantonese speakers).
      
      Lyrics:
      ${text}

      Rules:
      1. Keep the line structure exactly as the input.
      2. Punctuation should be treated as a character with empty jyutping and homophone.
      3. Spaces should be preserved.
      4. Ensure the output is a valid JSON array of lines.
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            units: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  char: { type: Type.STRING },
                  jyutping: { type: Type.STRING },
                  homophone: { type: Type.STRING }
                },
                required: ["char", "jyutping", "homophone"]
              }
            }
          },
          required: ["units"]
        }
      }
    }
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return data;
  } catch (error) {
    console.error("Failed to parse Gemini response", error);
    return [];
  }
};
