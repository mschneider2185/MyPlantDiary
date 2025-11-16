import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const savePlantSchema = z.object({
  speciesId: z.string().uuid(),
  nickname: z.string().trim().max(120).optional(),
  imageBase64: z
    .string()
    .trim()
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = savePlantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { speciesId, nickname, imageBase64 } = parsed.data;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: species, error: speciesError } = await supabase
      .from("species")
      .select("id, common_name, scientific_name")
      .eq("id", speciesId)
      .maybeSingle();

    if (speciesError || !species) {
      return NextResponse.json({ error: "Species not found" }, { status: 404 });
    }

    const { data: plant, error } = await supabase
      .from("plants")
      .insert({
        owner_id: user.id,
        species_id: speciesId,
        nickname: nickname ?? null,
        image_url: imageBase64 ?? null,
      })
      .select(
        `
          id,
          nickname,
          image_url,
          species:species(
            id,
            common_name,
            scientific_name
          )
        `
      )
      .single();

    if (error) {
      console.error("[plants] failed to save plant", error);
      return NextResponse.json({ error: "Failed to save plant" }, { status: 500 });
    }

    return NextResponse.json({ plant });
  } catch (err: any) {
    console.error("[plants] unexpected error", err);
    return NextResponse.json({ error: err.message ?? "Unknown error" }, { status: 500 });
  }
}

