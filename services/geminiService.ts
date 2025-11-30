
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Role, ChatMode } from "../types";

// --- API KEYS ---
const GEMINI_API_KEY = process.env.API_KEY;

export const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const BASE_SYSTEM_INSTRUCTION = `
אתה "אייבן" (Aivan), מומחה עולמי לפיתוח אתרים (Senior Full Stack Web Developer) וארכיטקט UI/UX.
המטרה העליונה שלך היא לבנות אתרים מרהיבים, מודרניים, רספונסיביים ופונקציונליים לחלוטין.
דבר תמיד בעברית אדיבה ומקצועית.
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

  // Inject Current Code Context if available (Branching Logic)
  if (currentCode) {
    const codeContext = `\n\n[הקוד הנוכחי במערכת]\n(המשתמש צופה בגרסה זו כרגע. עליך לערוך ולשנות את הקוד הזה ספציפית בהתאם לבקשה):\n\`\`\`html\n${currentCode}\n\`\`\`\n\n`;
    fullPrompt = codeContext + fullPrompt;
  }

  let historyContext = "";
  if (history.length > 0) {
    historyContext = "היסטוריית שיחה:\n" + history.map(msg => `${msg.role === Role.USER ? 'User' : 'Aivan'}: ${msg.text}`).join("\n") + "\n\nבקשה חדשה:\n";
    fullPrompt = historyContext + fullPrompt;
  }

  let specificInstruction = "";
  if (chatMode === ChatMode.CREATOR) {
    specificInstruction = `
    מצב עבודה: **סוכן / יוצר אתרים (Website Creator & Editor)**.
    
    הנחיות קריטיות ליצירה ועריכה:
    1. **עריכה מול יצירה**:
       - אם סופק [הקוד הנוכחי במערכת], **אסור לך ליצור אתר חדש מאפס**.
       - עליך לקחת את הקוד הקיים ולבצע בו אך ורק את השינויים שהמשתמש ביקש (הוספת אלמנטים, שינוי עיצוב, תיקון באגים).
       - שמור על המבנה הקיים והקפד לא למחוק חלקים חיוניים אלא אם התבקשת.
    2. **מומחיות**: צור קוד HTML/CSS/JS מלא, מודרני ונקי. השתמש ב-Tailwind CSS לעיצוב מהיר ומרשים (הספרייה כבר קיימת ב-Environment).
    3. **קובץ יחיד**: פלט הקוד חייב להיות קובץ HTML יחיד הכולל את ה-CSS (<style>) וה-JS (<script>) בתוכו, כדי שיעבוד בתצוגה המקדימה.
    
    4. **פורמט תשובה (חשוב מאוד!)**:
       - חלק ראשון: הסבר טקסטואלי קצר על השינויים (בעברית).
       - **מפריד**: כתוב בדיוק את המחרוזת: "___AIVAN_CODE_START___"
       - חלק שני: בלוק קוד (Markdown) המכיל את הקוד המלא והמעודכן.
       - **חובה**: הקוד חייב להיות בתוך בלוק \`\`\`html ... \`\`\`.
       - **חובה**: תמיד החזר את הקוד המלא (Full Source Code), לא רק מקטעים (Snippets).
    
    דוגמה לפלט:
    "הוספתי את כפתור יצירת הקשר ושניתי את הרקע לכחול."
    ___AIVAN_CODE_START___
    \`\`\`html
    <html>...</html>
    \`\`\`

    חשוב מאוד: אם המשתמש שואל שאלה כללית שאינה קשורה לבנייה או עריכת האתר, ענה:
    "הבוט רק מוסיף, מתקן שגיאות ומשפר את הקוד".
    `;
  } else {
    specificInstruction = `
    מצב עבודה: **שאלה / ייעוץ (Consultant)**.
    המטרה שלך היא לענות לשאלות טכניות, להסביר לוגיקה, להציע רעיונות לעיצוב או לעזור בדיבאג.
    אל תכתוב את כל הקוד של האפליקציה מחדש אלא אם התבקשת ספציפית.
    התמקד בהסברים טקסטואליים ברורים, טיפים ודוגמאות קוד קצרות (Snippets) במידת הצורך.
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

// --- UNIFIED SEND MESSAGE ---
export const sendMessageToGemini = async (
  prompt: string,
  history: ChatMessage[],
  files?: FileList | null,
  modelId: string = 'gemini-2.5-flash',
  chatMode: ChatMode = ChatMode.CREATOR,
  currentCode?: string
): Promise<string> => {
  // Simple non-streaming wrapper for legacy support if needed
  let fullText = "";
  const generator = sendMessageToGeminiStream(prompt, history, files, modelId, chatMode, currentCode);
  for await (const chunk of generator) {
    fullText += chunk;
  }
  return fullText;
};

// --- UNIFIED STREAMING FUNCTION ---
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
  const maxRetries = 3;

  while (true) {
    try {
       // GOOGLE GEMINI HANDLER (Default)
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
      if (signal?.aborted) {
        console.log("Stream aborted by user");
        return;
      }

      // Handle Rate Limit (429)
      if (error.status === 429 || error.code === 429 || error.message?.includes('429')) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error("Provider 429 Exhausted:", error);
          throw new Error("הגעת למגבלת הבקשות (Rate Limit) במודל זה. אנא נסה מודל אחר או המתן.");
        }
        console.warn(`Rate limit hit. Retrying (${retryCount}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, retryCount)));
        continue;
      }

      console.error("AI Service Error:", error);
      throw new Error("שגיאה בתקשורת עם השרת (AI Provider Error).");
    }
  }
}
