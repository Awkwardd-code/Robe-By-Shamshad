import "server-only";

export type NidExtractedData = {
  fullName: string;
  nidNumber: string;
  dateOfBirth: string;
  fatherName: string;
  motherName: string;
  address: string;
};

export type NidExtractionMeta = {
  provider: "openai";
  model: string;
  confidence: "high" | "medium" | "low" | "unknown";
  notes: string;
  rawText: string;
  extractedAt: string;
};

export type NidExtractionSuccess = {
  success: true;
  extractedData: NidExtractedData;
  meta: NidExtractionMeta;
};

export type NidExtractionFailure = {
  success: false;
  code: "missing_openai_key" | "openai_request_failed" | "openai_response_invalid";
  error: string;
};

export type NidExtractionResult = NidExtractionSuccess | NidExtractionFailure;

const EMPTY_NID_DATA: NidExtractedData = {
  fullName: "",
  nidNumber: "",
  dateOfBirth: "",
  fatherName: "",
  motherName: "",
  address: "",
};

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_NID_MODEL || "gpt-4.1-mini";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function pickObjectFromText(value: string): Record<string, unknown> | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const direct = JSON.parse(trimmed);
    if (direct && typeof direct === "object" && !Array.isArray(direct)) {
      return direct as Record<string, unknown>;
    }
  } catch {
    // noop
  }

  const start = trimmed.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidate = trimmed.slice(start, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
          }
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function normalizeExtractedData(value: Record<string, unknown> | null): NidExtractedData {
  if (!value) return EMPTY_NID_DATA;
  return {
    fullName: asString(value.fullName),
    nidNumber: asString(value.nidNumber),
    dateOfBirth: asString(value.dateOfBirth),
    fatherName: asString(value.fatherName),
    motherName: asString(value.motherName),
    address: asString(value.address),
  };
}

function readContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("\n");
}

function hasAnyExtractedValue(data: NidExtractedData): boolean {
  return Object.values(data).some((value) => value.length > 0);
}

function normalizeConfidence(value: unknown): NidExtractionMeta["confidence"] {
  const normalized = asString(value).toLowerCase();
  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  if (normalized === "low") return "low";
  return "unknown";
}

export async function extractNidDataFromImages(input: {
  frontImageUrl: string;
  backImageUrl: string;
}): Promise<NidExtractionResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      success: false,
      code: "missing_openai_key",
      error: "OPENAI_API_KEY is missing. Configure it to enable NID extraction.",
    };
  }

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 35000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: abortController.signal,
      body: JSON.stringify({
        model: DEFAULT_OPENAI_MODEL,
        temperature: 0,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "nid_extraction",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                fullName: { type: "string" },
                nidNumber: { type: "string" },
                dateOfBirth: { type: "string" },
                fatherName: { type: "string" },
                motherName: { type: "string" },
                address: { type: "string" },
                rawText: { type: "string" },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low", "unknown"],
                },
                notes: { type: "string" },
              },
              required: [
                "fullName",
                "nidNumber",
                "dateOfBirth",
                "fatherName",
                "motherName",
                "address",
                "rawText",
                "confidence",
                "notes",
              ],
            },
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You extract structured fields from Bangladeshi National ID cards. Return only valid JSON.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: [
                  "Extract these fields from the two NID images:",
                  "fullName, nidNumber, dateOfBirth, fatherName, motherName, address, rawText, confidence, notes.",
                  "Rules:",
                  "- If a field is not visible, return empty string.",
                  "- Keep original spelling.",
                  "- nidNumber should be digits only when possible.",
                  "- dateOfBirth should be DD/MM/YYYY when visible.",
                ].join("\n"),
              },
              { type: "image_url", image_url: { url: input.frontImageUrl } },
              { type: "image_url", image_url: { url: input.backImageUrl } },
            ],
          },
        ],
      }),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok || !json) {
      const apiError =
        asString((json as { error?: { message?: string } })?.error?.message) ||
        "OpenAI request failed.";
      return {
        success: false,
        code: "openai_request_failed",
        error: apiError,
      };
    }

    const rawContent = json?.choices?.[0]?.message?.content;
    const contentText = readContentText(rawContent);
    const parsed = pickObjectFromText(contentText);
    const extractedData = normalizeExtractedData(parsed);
    if (!hasAnyExtractedValue(extractedData)) {
      return {
        success: false,
        code: "openai_response_invalid",
        error: "Could not extract readable NID data from the submitted images.",
      };
    }

    return {
      success: true,
      extractedData,
      meta: {
        provider: "openai",
        model: asString(json?.model) || DEFAULT_OPENAI_MODEL,
        confidence: normalizeConfidence(parsed?.confidence),
        notes: asString(parsed?.notes),
        rawText: asString(parsed?.rawText),
        extractedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      success: false,
      code: "openai_request_failed",
      error: error instanceof Error ? error.message : "OpenAI request failed.",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
