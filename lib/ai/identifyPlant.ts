import { Buffer } from "node:buffer";

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
  provider: "plantnet";
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

function extractBase64(value: string) {
  const match = /^data:(?<mime>[^;]+);base64,(?<base64>.+)$/.exec(value);
  if (!match?.groups?.base64) {
    throw new Error("Invalid data URL format.");
  }
  return match.groups.base64;
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
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    throw new Error("PLANTNET_API_KEY is not set.");
  }

  const project = process.env.PLANTNET_PROJECT ?? "all";
  const base64 = extractBase64(ensureDataUrl(imageDataUrl));

  const formData = new FormData();
  const decoded = Buffer.from(base64, "base64");
  formData.append("images", new Blob([decoded]), "upload.jpg");
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
