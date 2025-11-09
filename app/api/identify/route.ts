import { NextRequest, NextResponse } from "next/server";
import { identifyPlant } from "@/lib/ai/identifyPlant";
import { ensureSpeciesProfile } from "@/lib/species/profile";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: "Missing image" }, { status: 400 });

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await identifyPlant(imageBase64);
    let speciesProfile = null;
    try {
      speciesProfile = await ensureSpeciesProfile(result);
    } catch (profileError) {
      console.error("[identify] Failed to ensure species profile", profileError);
    }

    let speciesId: string | null = speciesProfile?.id ?? null;
    if (!speciesId && result.plant.scientificName) {
      const { data: species, error: speciesError } = await supabase
        .from("species")
        .select("id")
        .eq("scientific_name", result.plant.scientificName)
        .maybeSingle();

      if (!speciesError && species?.id) {
        speciesId = species.id;
      }
    }

    const { data: record, error: insertError } = await supabase
      .from("plant_identifications")
      .insert({
        user_id: user.id,
        provider: result.provider,
        provider_confidence: result.plant.confidence,
        common_name: result.plant.commonName,
        scientific_name: result.plant.scientificName,
        family: result.plant.family,
        genus: result.plant.genus,
        notes: result.plant.notes,
        alternatives: result.alternatives,
        provider_payload: result.raw,
        species_id: speciesId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[identify] Failed to store identification", insertError);
      throw insertError;
    }

    return NextResponse.json({ result, species: speciesProfile, record });
  } catch (e: any) {
    console.error("[identify] failed", e);
    return NextResponse.json({ error: e.message ?? "Unknown error" }, { status: 500 });
  }
}
