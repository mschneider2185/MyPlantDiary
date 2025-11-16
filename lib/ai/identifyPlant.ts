import { Buffer } from "node:buffer";
import OpenAI from "openai";

type PlantnetCandidate = {
  score: number;
  species: {
    scientificNameWithoutAuthor?: string;
    scientificNameAuthorship?: string;
    genus?: {
      scientificNameWithoutAuthor?: string;
    };
    family?: {
      scientificNameWithoutAuthor?: string;
    };
    commonNames?: string[];
    bibliography?: string;
  };
  gbif?: {
    id?: number;
  };
};

type PlantnetResponse = {
  results?: PlantnetCandidate[];
};

export type IdentificationResult = {
  provider: "plantnet" | "openai";
  plant: {
    commonName: string | null;
    scientificName: string | null;
    family: string | null;
    genus: string | null;
    confidence: number | null;
    notes: string | null;
  };
  alternatives: Array<{
    commonName: string | null;
    scientificName: string | null;
    confidence: number | null;
  }>;
  raw: PlantnetResponse;
};

function ensureDataUrl(value: string) {
  if (!value.startsWith("data:")) {
    throw new Error("Expected a base64 data URL.");
  }
  return value;
}

function parseDataUrl(value: string) {
  const match = /^data:(?<mime>[^;]+);base64,(?<base64>.+)$/.exec(value);
  if (!match?.groups?.base64 || !match.groups.mime) {
    throw new Error("Invalid data URL format.");
  }
  return { mime: match.groups.mime, base64: match.groups.base64 };
}

function pickTopResult(results: PlantnetCandidate[] = []) {
  if (!results.length) {
    return null;
  }
  return results[0];
}

function toIdentification(response: PlantnetResponse): IdentificationResult {
  const top = pickTopResult(response.results ?? []);
  const plant = top?.species;
  const toAlt = (candidate: PlantnetCandidate) => ({
    commonName: candidate.species.commonNames?.[0] ?? null,
    scientificName:
      candidate.species.scientificNameWithoutAuthor ??
      candidate.species.genus?.scientificNameWithoutAuthor ??
      null,
    confidence: candidate.score ?? null,
  });

  return {
    provider: "plantnet",
    plant: {
      commonName: plant?.commonNames?.[0] ?? null,
      scientificName:
        plant?.scientificNameWithoutAuthor ??
        (plant?.scientificNameAuthorship
          ? `${plant.scientificNameWithoutAuthor} ${plant.scientificNameAuthorship}`
          : null),
      family: plant?.family?.scientificNameWithoutAuthor ?? null,
      genus: plant?.genus?.scientificNameWithoutAuthor ?? null,
      confidence: top?.score ?? null,
      notes: plant?.bibliography ?? null,
    },
    alternatives: (response.results ?? []).slice(1, 5).map(toAlt),
    raw: response,
  };
}

export async function identifyPlant(imageDataUrl: string): Promise<IdentificationResult> {
  // Defensive: if someone sets PLANTNET_PROJECT=openai by mistake, prefer OpenAI.
  const hintedProvider =
    process.env.PLANTNET_PROJECT?.toLowerCase() === "openai"
      ? "openai"
      : undefined;
  const provider = (hintedProvider ?? process.env.PLANT_ID_PROVIDER ?? "plantnet").toLowerCase();
  if (provider === "openai") {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY is not set.");
    }
    const openai = new OpenAI({ apiKey: openaiKey });
    const model = process.env.OPENAI_PLANT_VISION_MODEL ?? "gpt-4o-mini";

    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["plant", "alternatives"],
      properties: {
        plant: {
          type: "object",
          additionalProperties: false,
          required: ["commonName", "scientificName", "family", "genus", "confidence", "notes"],
          properties: {
            commonName: { type: ["string", "null"] },
            scientificName: { type: ["string", "null"] },
            family: { type: ["string", "null"] },
            genus: { type: ["string", "null"] },
            confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
            notes: { type: ["string", "null"] },
          },
        },
        alternatives: {
          type: "array",
          maxItems: 4,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["commonName", "scientificName", "confidence"],
            properties: {
              commonName: { type: ["string", "null"] },
              scientificName: { type: ["string", "null"] },
              confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
            },
          },
        },
      },
    } as const;

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a botanist. Identify the plant in the image. Prefer cultivar-level names when obvious (e.g., 'Marble Queen pothos'). Return JSON only.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Identify this plant. Respond using the provided JSON schema." },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "PlantIdentification", schema, strict: true },
      },
      temperature: 0.2,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("OpenAI did not return any content.");
    }
    const parsed = JSON.parse(raw) as {
      plant: {
        commonName: string | null;
        scientificName: string | null;
        family: string | null;
        genus: string | null;
        confidence: number | null;
        notes: string | null;
      };
      alternatives: Array<{ commonName: string | null; scientificName: string | null; confidence: number | null }>;
    };

    return {
      provider: "openai",
      plant: parsed.plant,
      alternatives: parsed.alternatives ?? [],
      raw: parsed as any,
    };
  }

  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    throw new Error("PLANTNET_API_KEY is not set.");
  }

  const project = process.env.PLANTNET_PROJECT ?? "all";
  const { mime, base64 } = parseDataUrl(ensureDataUrl(imageDataUrl));

  const formData = new FormData();
  const decoded = Buffer.from(base64, "base64");
  const extension = mime === "image/png" ? "png" : "jpg";
  formData.append("images", new Blob([decoded], { type: mime }), `upload.${extension}`);
  formData.append("organs", "leaf");

  const endpoint = new URL(
    `https://my-api.plantnet.org/v2/identify/${project}?api-key=${apiKey}`
  );

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PlantNet request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as PlantnetResponse;
  return toIdentification(data);
}
