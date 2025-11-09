import OpenAI from "openai";
const plantCareProfileJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "difficulty", "watering", "sunlight", "temperature", "humidity", "soil", "tips"],
  properties: {
    summary: { type: "string", minLength: 1 },
    difficulty: {
      type: "string",
      enum: ["Easy", "Moderate", "Challenging"],
    },
    watering: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "description"],
      properties: {
        headline: { type: "string", minLength: 1 },
        description: { type: "string", minLength: 1 },
      },
    },
    sunlight: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "description"],
      properties: {
        headline: { type: "string", minLength: 1 },
        description: { type: "string", minLength: 1 },
      },
    },
    temperature: {
      type: "object",
      additionalProperties: false,
      required: ["rangeF", "description"],
      properties: {
        rangeF: { type: "string", minLength: 1 },
        description: { type: "string", minLength: 1 },
      },
    },
    humidity: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "description"],
      properties: {
        headline: { type: "string", minLength: 1 },
        description: { type: "string", minLength: 1 },
      },
    },
    soil: {
      type: "object",
      additionalProperties: false,
      required: ["type", "phRange", "mix"],
      properties: {
        type: { type: "string", minLength: 1 },
        phRange: {
          type: "object",
          additionalProperties: false,
          required: ["min", "max"],
          properties: {
            min: { type: ["number", "null"] },
            max: { type: ["number", "null"] },
          },
        },
        mix: {
          type: "array",
          items: { type: "string", minLength: 1 },
          maxItems: 6,
        },
      },
    },
    tips: {
      type: "array",
      items: { type: "string", minLength: 1 },
      maxItems: 6,
    },
  },
} as const;

export type PlantCareProfile = {
  summary: string;
  difficulty: "Easy" | "Moderate" | "Challenging";
  watering: {
    headline: string;
    description: string;
  };
  sunlight: {
    headline: string;
    description: string;
  };
  temperature: {
    rangeF: string;
    description: string;
  };
  humidity: {
    headline: string;
    description: string;
  };
  soil: {
    type: string;
    phRange: {
      min: number | null;
      max: number | null;
    };
    mix: string[];
  };
  tips: string[];
};

type GenerateProfileInput = {
  commonName?: string | null;
  scientificName?: string | null;
  family?: string | null;
  genus?: string | null;
};

const systemPrompt = `
You are a plant-care coach creating concise, accurate care guidance for houseplants.
Write in a friendly, encouraging tone aimed at new plant owners.
Only respond with JSON that matches the provided schema.
When you are uncertain, make the safest, most common recommendation and note the caution.
Use Fahrenheit for temperature ranges and include Celsius conversions in parentheses.
Keep bullet/tip entries short (under 18 words). Avoid duplicate advice.
`.trim();

export async function generatePlantProfile(input: GenerateProfileInput): Promise<PlantCareProfile> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_PLANT_MODEL ?? "gpt-4o-mini";

  const plantDescriptor = {
    commonName: input.commonName ?? null,
    scientificName: input.scientificName ?? null,
    family: input.family ?? null,
    genus: input.genus ?? null,
  };

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `
Generate a structured care profile for the following plant.
Return JSON only. When necessary, infer details from similar, well-known houseplants.

Plant input:
${JSON.stringify(plantDescriptor, null, 2)}
`.trim(),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "PlantCareProfile",
        schema: plantCareProfileJsonSchema,
        strict: true,
      },
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI did not return any content.");
  }

  const parsed = JSON.parse(raw) as PlantCareProfile;
  return parsed;
}

