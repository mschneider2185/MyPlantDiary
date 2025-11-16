import { generatePlantProfile } from "@/lib/ai/generatePlantProfile";
import type { IdentificationResult } from "@/lib/ai/identifyPlant";
import { createAdminClient } from "@/lib/supabase/admin";

type SpeciesRecord = {
  id: string;
  common_name: string | null;
  scientific_name: string | null;
  family: string | null;
  origin: string | null;
  water_needs: string | null;
  light_needs: string | null;
  soil: string | null;
  humidity: string | null;
  temperature: string | null;
  about: string | null;
  care_summary: string | null;
  care_difficulty: string | null;
  watering: string | null;
  sunlight: string | null;
  temperature_range: string | null;
  temperature_notes: string | null;
  soil_type: string | null;
  soil_ph_min: number | null;
  soil_ph_max: number | null;
  soil_mix: string[] | null;
  care_tips: string[] | null;
  profile_generated_at: string | null;
  profile_source: string | null;
};

const REQUIRED_PROFILE_FIELDS: (keyof SpeciesRecord)[] = [
  "care_summary",
  "care_difficulty",
  "watering",
  "sunlight",
  "temperature_range",
  "temperature_notes",
  "soil_type",
];

const PLACEHOLDER_VALUES = new Set(["string", "n/a", "unknown"]);

function sanitizeStringList(values: string[] | null | undefined) {
  if (!values) return [];
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => !!value && !PLACEHOLDER_VALUES.has(value.toLowerCase()));
}

function sanitizeString(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || PLACEHOLDER_VALUES.has(trimmed.toLowerCase())) {
    return null;
  }
  return trimmed;
}

function isProfileComplete(record: SpeciesRecord): boolean {
  return REQUIRED_PROFILE_FIELDS.every((field) => {
    const value = record[field];
    if (Array.isArray(value)) {
      return sanitizeStringList(value).length > 0;
    }
    if (typeof value === "string") {
      return !!sanitizeString(value);
    }
    return value != null && value !== "";
  });
}

async function fetchSpeciesByScientificName(scientificName: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("species")
    .select("*")
    .eq("scientific_name", scientificName)
    .maybeSingle<SpeciesRecord>();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function insertSpecies(result: IdentificationResult, scientificName: string) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("species").insert({
    common_name: result.plant.commonName,
    scientific_name: scientificName,
    family: result.plant.family,
    water_needs: null,
    light_needs: null,
    soil: null,
    humidity: null,
    temperature: null,
    about: null,
  });

  if (error) {
    throw error;
  }
}

export async function ensureSpeciesProfile(result: IdentificationResult): Promise<SpeciesRecord | null> {
  const scientificName = result.plant.scientificName;
  if (!scientificName) {
    return null;
  }

  let species = await fetchSpeciesByScientificName(scientificName);
  if (!species) {
    await insertSpecies(result, scientificName);
    species = (await fetchSpeciesByScientificName(scientificName)) ?? null;
  }

  if (!species) {
    return null;
  }

  if (isProfileComplete(species)) {
    return species;
  }

  const profile = await generatePlantProfile({
    commonName: result.plant.commonName,
    scientificName: result.plant.scientificName,
    family: result.plant.family,
    genus: result.plant.genus,
  });

  const soilMix = sanitizeStringList(profile.soil.mix);
  const careTips = sanitizeStringList(profile.tips);

  const supabase = createAdminClient();
  const updatePayload = {
    care_summary: profile.summary,
    care_difficulty: profile.difficulty,
    watering: profile.watering.description,
    water_needs: profile.watering.headline,
    sunlight: profile.sunlight.description,
    light_needs: profile.sunlight.headline,
    temperature_range: profile.temperature.rangeF,
    temperature_notes: profile.temperature.description,
    temperature: profile.temperature.rangeF,
    humidity: profile.humidity.headline,
    soil_type: sanitizeString(profile.soil.type) ?? "Well-draining mix",
    soil: sanitizeString(profile.soil.type),
    soil_ph_min: profile.soil.phRange.min,
    soil_ph_max: profile.soil.phRange.max,
    soil_mix: soilMix.length ? soilMix : null,
    care_tips: careTips.length ? careTips : null,
    profile_generated_at: new Date().toISOString(),
    profile_source: "openai",
  };

  const { error } = await supabase
    .from("species")
    .update(updatePayload)
    .eq("id", species.id);

  if (error) {
    throw error;
  }

  return (await fetchSpeciesByScientificName(scientificName)) ?? null;
}

