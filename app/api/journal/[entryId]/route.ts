import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const updateSchema = z.object({
	body: z.string().trim().min(1).max(5000).optional(),
	photo_url: z.string().url().nullable().optional(),
});

async function ensureEntryOwnership(supabase: ReturnType<typeof createClient>, entryId: string, userId: string) {
	const { data, error } = await supabase
		.from("journal")
		.select("id, plant_id, plants:plant_id(owner_id)")
		.eq("id", entryId)
		.maybeSingle();
	if (error || !data) return { ok: false as const, status: 404 as const };
	// @ts-ignore - plants is a related object alias; typing not enforced here
	const ownerId = data?.plants?.owner_id;
	if (!ownerId || ownerId !== userId) return { ok: false as const, status: 403 as const };
	return { ok: true as const };
}

export async function PATCH(req: NextRequest, { params }: { params: { entryId: string } }) {
	try {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const ownership = await ensureEntryOwnership(supabase, params.entryId, user.id);
		if (!ownership.ok) return NextResponse.json({ error: ownership.status === 403 ? "Forbidden" : "Not found" }, { status: ownership.status });

		const json = await req.json().catch(() => ({}));
		const parsed = updateSchema.safeParse(json);
		if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

		if (Object.keys(parsed.data).length === 0) return NextResponse.json({ entry: null });

		const { data: updated, error } = await supabase
			.from("journal")
			.update(parsed.data)
			.eq("id", params.entryId)
			.select("id, plant_id, body, photo_url, created_at")
			.single();
		if (error) {
			console.error("[journal:PATCH] failed to update entry", error);
			return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
		}
		return NextResponse.json({ entry: updated });
	} catch (err) {
		console.error("[journal:PATCH] unexpected error", err);
		return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
	}
}

export async function DELETE(_req: NextRequest, { params }: { params: { entryId: string } }) {
	try {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const ownership = await ensureEntryOwnership(supabase, params.entryId, user.id);
		if (!ownership.ok) return NextResponse.json({ error: ownership.status === 403 ? "Forbidden" : "Not found" }, { status: ownership.status });

		const { error } = await supabase.from("journal").delete().eq("id", params.entryId);
		if (error) {
			console.error("[journal:DELETE] failed to delete entry", error);
			return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
		}
		return NextResponse.json({ success: true });
	} catch (err) {
		console.error("[journal:DELETE] unexpected error", err);
		return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
	}
}


