
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Role, ChatMode } from "../types";

// --- API KEYS ---
// The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// We use it directly in the constructor below.

export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BASE_SYSTEM_INSTRUCTION = `
You are Aivan, an expert Full Stack Web Developer.
Your goal is to generate COMPLETE, WORKING HTML websites in a single file.

### CRITICAL OUTPUT RULES:
1. **NO PREAMBLE**: Start your response DIRECTLY with the code or a very brief confirmation.
2. **HTML FORMAT**: You MUST output the code inside a standard code block or starting with <!DOCTYPE html>.
3. **SINGLE FILE**: CSS and JS must be embedded within the HTML file (using <style> and <script> tags).
4. **NO PLACEHOLDERS**: Do not use "..." or comments like "rest of code here". Write the full, functional code.
5. **HEBREW UI**: The website interface should be in Hebrew (dir="rtl") unless requested otherwise.
`;

export const fileToPart = (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const buildContextAndInstructions = (
  prompt: string,
  history: ChatMessage[],
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string
) => {
  let fullPrompt = prompt;

  if (currentCode) {
    const codeContext = `\n\n[EXISTING CODE TO MODIFY]\n\`\`\`html\n${currentCode}\n\`\`\`\n\nIMPORTANT: Return the FULL updated code, not just diffs.\n`;
    fullPrompt = codeContext + fullPrompt;
  }

  let historyContext = "";
  if (history.length > 0) {
    const recentHistory = history.slice(-10);
    historyContext = "Chat History:\n" + recentHistory.map(msg => `${msg.role === Role.USER ? 'User' : 'Aivan'}: ${msg.text}`).join("\n") + "\n\nUser Request:\n";
    fullPrompt = historyContext + fullPrompt;
  }

  let specificInstruction = "";
  if (chatMode === ChatMode.CREATOR) {
    specificInstruction = `
    MODE: **CREATOR**.
    TASK: Generate or Modify HTML/CSS/JS code.
    `;
  } else {
    specificInstruction = `
    MODE: **CONSULTANT**.
    TASK: Answer questions or explain the code. Do not generate full code unless asked.
    `;
  }

  return {
    fullPrompt,
    systemInstruction: BASE_SYSTEM_INSTRUCTION + specificInstruction
  };
};

// --- GEMINI HANDLER ---
const buildGeminiRequest = async (
  prompt: string,
  history: ChatMessage[],
  files?: FileList | null,
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string
) => {
  const { fullPrompt, systemInstruction } = buildContextAndInstructions(prompt, history, chatMode, currentCode);
  
  const parts: any[] = [{ text: fullPrompt }];

  if (files && files.length > 0) {
    for (let i = 0; i < files.length; i++) {
      const filePart = await fileToPart(files[i]);
      parts.push(filePart);
    }
  }

  return {
    contents: { role: 'user', parts: parts },
    systemInstruction
  };
};

export const generateProjectTitle = async (prompt: string, codeSnippet: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { 
          role: 'user', 
          parts: [{ text: `Generate a short, catchy Hebrew title (2-4 words) for this web project based on the prompt: "${prompt}". Do not use quotes.` }] 
        }
      ]
    });
    return response.text?.trim() || prompt.substring(0, 20);
  } catch (e) {
    return prompt.substring(0, 20);
  }
};

export const sendMessageToGemini = async (
  prompt: string,
  history: ChatMessage[],
  files?: FileList | null,
  modelId: string = 'gemini-2.5-flash',
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string
): Promise<string> => {
  let fullText = "";
  const generator = sendMessageToGeminiStream(prompt, history, files, modelId, chatMode, currentCode);
  for await (const chunk of generator) {
    fullText += chunk;
  }
  return fullText;
};

export async function* sendMessageToGeminiStream(
  prompt: string,
  history: ChatMessage[],
  files?: FileList | null,
  modelId: string = 'gemini-2.5-flash',
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string,
  signal?: AbortSignal
) {
  let retryCount = 0;
  const maxRetries = 2;

  while (retryCount <= maxRetries) {
    try {
       const { contents, systemInstruction } = await buildGeminiRequest(prompt, history, files, chatMode, currentCode);

       const responseStream = await ai.models.generateContentStream({
         model: modelId,
         contents,
         config: { systemInstruction }
       });
 
       for await (const chunk of responseStream) {
         if (signal?.aborted) return;
         yield chunk.text;
       }
       return;

    } catch (error: any) {
      if (signal?.aborted) return;
      
      console.error("Gemini API Error:", error);
      
      if (error.status === 429 || error.message?.includes('429')) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        continue;
      }
      throw new Error("שגיאה בתקשורת עם השרת. אנא נסה שוב.");
    }
  }
}