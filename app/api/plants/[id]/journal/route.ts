import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const createJournalSchema = z.object({
	body: z.string().trim().min(1).max(5000),
	photo_url: z.string().url().nullable().optional(),
});

async function ensureOwnership(supabase: ReturnType<typeof createClient>, plantId: string, userId: string) {
	const { data: plant, error } = await supabase.from("plants").select("id, owner_id").eq("id", plantId).maybeSingle();
	if (error || !plant) return { ok: false as const, status: 404 as const };
	if (plant.owner_id !== userId) return { ok: false as const, status: 403 as const };
	return { ok: true as const };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const ownership = await ensureOwnership(supabase, params.id, user.id);
		if (!ownership.ok) return NextResponse.json({ error: ownership.status === 403 ? "Forbidden" : "Not found" }, { status: ownership.status });

		const { searchParams } = new URL(req.url);
		const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "10")));
		const before = searchParams.get("before"); // ISO timestamp cursor

		let query = supabase
			.from("journal")
			.select("id, plant_id, body, photo_url, created_at")
			.eq("plant_id", params.id)
			.order("created_at", { ascending: false })
			.limit(limit + 1);

		if (before) {
			query = query.lt("created_at", before);
		}

		const { data, error } = await query;
		if (error) {
			console.error("[journal:GET] failed to fetch entries", error);
			return NextResponse.json({ error: "Failed to fetch journal" }, { status: 500 });
		}

		const hasMore = (data?.length ?? 0) > limit;
		const entries = (data ?? []).slice(0, limit);
		const nextCursor = hasMore ? entries[entries.length - 1]?.created_at ?? null : null;

		return NextResponse.json({ entries, nextCursor });
	} catch (err) {
		console.error("[journal:GET] unexpected error", err);
		return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
	}
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const supabase = createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

		const ownership = await ensureOwnership(supabase, params.id, user.id);
		if (!ownership.ok) return NextResponse.json({ error: ownership.status === 403 ? "Forbidden" : "Not found" }, { status: ownership.status });

		const body = await req.json();
		const parsed = createJournalSchema.safeParse(body);
		if (!parsed.success) {
			return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
		}

		const { data: inserted, error } = await supabase
			.from("journal")
			.insert({
				plant_id: params.id,
				body: parsed.data.body,
				photo_url: parsed.data.photo_url ?? null,
			})
			.select("id, plant_id, body, photo_url, created_at")
			.single();
		if (error) {
			console.error("[journal:POST] failed to create entry", error);
			return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
		}
		return NextResponse.json({ entry: inserted });
	} catch (err) {
		console.error("[journal:POST] unexpected error", err);
		return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
	}
}


