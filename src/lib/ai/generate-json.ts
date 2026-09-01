type GenerateOptions = {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
};

type GenerateJsonOptions = GenerateOptions;

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }
  return trimmed;
}

function openAiUsesMaxCompletionTokens(model: string): boolean {
  const id = model.toLowerCase();
  return (
    id.startsWith("o1") ||
    id.startsWith("o3") ||
    id.startsWith("o4") ||
    id.startsWith("gpt-5")
  );
}

function buildOpenAiRequestBody(
  model: string,
  options: GenerateOptions,
  asJson: boolean,
): Record<string, unknown> {
  const tokenLimit = options.maxTokens ?? (asJson ? 4096 : 12000);
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.userPrompt },
    ],
  };

  if (openAiUsesMaxCompletionTokens(model)) {
    body.max_completion_tokens = tokenLimit;
  } else {
    body.temperature = 0.4;
    body.max_tokens = tokenLimit;
  }

  if (asJson) {
    body.response_format = { type: "json_object" };
  }

  return body;
}

async function generateWithOpenAI(
  apiKey: string,
  model: string,
  options: GenerateOptions,
  asJson: boolean,
): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildOpenAiRequestBody(model, options, asJson)),
  });

  if (!response.ok) {
    console.error("openai generate failed", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() ?? null;
}

async function generateWithGemini(
  apiKey: string,
  model: string,
  options: GenerateOptions,
  asJson: boolean,
): Promise<string | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: options.maxTokens ?? (asJson ? 4096 : 12000),
        ...(asJson ? { responseMimeType: "application/json" } : {}),
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${options.systemPrompt}\n\n${options.userPrompt}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("gemini generate failed", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? null;
}

export function isAiConfigured(): boolean {
  return Boolean(
    process.env.OPENAI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim(),
  );
}

export async function generateJsonCompletion<T>(
  options: GenerateJsonOptions,
): Promise<T | null> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  let raw: string | null = null;

  if (openAiKey) {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    raw = await generateWithOpenAI(openAiKey, model, options, true);
  } else if (geminiKey) {
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    raw = await generateWithGemini(geminiKey, model, options, true);
  }

  if (!raw) return null;

  try {
    return JSON.parse(extractJsonObject(raw)) as T;
  } catch (error) {
    console.error("ai json parse failed", error);
    return null;
  }
}

export async function generateTextCompletion(
  options: GenerateOptions,
): Promise<string | null> {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (openAiKey) {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
    return generateWithOpenAI(openAiKey, model, options, false);
  }
  if (geminiKey) {
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
    return generateWithGemini(geminiKey, model, options, false);
  }
  return null;
}
