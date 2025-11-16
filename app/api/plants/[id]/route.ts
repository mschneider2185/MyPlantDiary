import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updatePlantSchema = z.object({
	nickname: z.string().trim().max(120).nullable().optional(),
	image_url: z.string().url().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const body = await req.json().catch(() => ({}));
		const parsed = updatePlantSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
		}

		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Ensure the plant belongs to the user
		const { data: plant, error: fetchErr } = await supabase
			.from("plants")
			.select("id, owner_id")
			.eq("id", params.id)
			.maybeSingle();

		if (fetchErr || !plant) {
			return NextResponse.json({ error: "Plant not found" }, { status: 404 });
		}
		if (plant.owner_id !== user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const updates: Record<string, any> = {};
		if ("nickname" in parsed.data) updates.nickname = parsed.data.nickname;
		if ("image_url" in parsed.data) updates.image_url = parsed.data.image_url;

		if (Object.keys(updates).length === 0) {
			return NextResponse.json({ plant: null }); // nothing to update
		}

		const { data: updated, error } = await supabase
			.from("plants")
			.update(updates)
			.eq("id", params.id)
			.eq("owner_id", user.id)
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
			console.error("[plants:PATCH] failed to update plant", error);
			return NextResponse.json({ error: "Failed to update plant" }, { status: 500 });
		}

		return NextResponse.json({ plant: updated });
	} catch (err: any) {
		console.error("[plants:PATCH] unexpected error", err);
		return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Ensure the plant belongs to the user
		const { data: plant, error: fetchErr } = await supabase
			.from("plants")
			.select("id, owner_id")
			.eq("id", params.id)
			.maybeSingle();

		if (fetchErr || !plant) {
			return NextResponse.json({ error: "Plant not found" }, { status: 404 });
		}
		if (plant.owner_id !== user.id) {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const { error } = await supabase.from("plants").delete().eq("id", params.id).eq("owner_id", user.id);

		if (error) {
			console.error("[plants:DELETE] failed to delete plant", error);
			return NextResponse.json({ error: "Failed to delete plant" }, { status: 500 });
		}

		return NextResponse.json({ success: true });
	} catch (err: any) {
		console.error("[plants:DELETE] unexpected error", err);
		return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
	}
}


