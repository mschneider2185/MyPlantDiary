"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";

type JournalEntry = {
	id: string;
	plant_id: string;
	body: string;
	photo_url: string | null;
	created_at: string;
};

type PlantNotesProps = {
	plantId: string;
};

export default function PlantNotes({ plantId }: PlantNotesProps) {
	const [entries, setEntries] = useState<JournalEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [note, setNote] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [nextCursor, setNextCursor] = useState<string | null>(null);

	const supabase = useMemo(() => createBrowserSupabase(), []);

	function formatRelative(iso: string) {
		const now = new Date();
		const then = new Date(iso);
		const diff = (now.getTime() - then.getTime()) / 1000;
		if (diff < 60) return "just now";
		if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
		if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
		return then.toLocaleDateString();
	}

	async function load(initial = false) {
		setLoading(true);
		setError(null);
		try {
			const qp = new URLSearchParams();
			qp.set("limit", "10");
			if (!initial && nextCursor) qp.set("before", nextCursor);
			const res = await fetch(`/api/plants/${plantId}/journal?` + qp.toString(), { cache: "no-store" });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error ?? "Failed to load notes");
			}
			const data = await res.json();
			if (initial) {
				setEntries(data.entries ?? []);
			} else {
				setEntries((prev) => [...prev, ...(data.entries ?? [])]);
			}
			setNextCursor(data.nextCursor ?? null);
		} catch (err: any) {
			setError(err.message ?? "Failed to load notes");
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		setEntries([]);
		setNextCursor(null);
		load(true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [plantId]);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!note.trim()) return;
		setSubmitting(true);
		setError(null);
		try {
			const res = await fetch(`/api/plants/${plantId}/journal`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ body: note.trim() }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error ?? "Failed to add note");
			}
			setNote("");
			// Reload from start
			setEntries([]);
			setNextCursor(null);
			await load(true);
		} catch (err: any) {
			setError(err.message ?? "Failed to add note");
		} finally {
			setSubmitting(false);
		}
	}

	async function onQuickAdd(text: string) {
		setNote(text);
		// submit immediately
		await onSubmit(new Event("submit") as any);
	}

	async function onDelete(entryId: string) {
		if (!confirm("Delete this note?")) return;
		try {
			const res = await fetch(`/api/journal/${entryId}`, { method: "DELETE" });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error ?? "Failed to delete");
			}
			setEntries((prev) => prev.filter((e) => e.id !== entryId));
		} catch (err: any) {
			setError(err.message ?? "Failed to delete");
		}
	}

	async function onEdit(entryId: string, body: string) {
		try {
			const res = await fetch(`/api/journal/${entryId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ body }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error ?? "Failed to update");
			}
			setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, body } : e)));
		} catch (err: any) {
			setError(err.message ?? "Failed to update");
		}
	}

	async function onUploadPhoto(file: File): Promise<string | null> {
		try {
			const ext = file.name.split(".").pop() || "jpg";
			const path = `${plantId}/${crypto.randomUUID()}.${ext}`;
			const { error: upErr } = await supabase.storage.from("journal").upload(path, file, {
				cacheControl: "3600",
				upsert: false,
			});
			if (upErr) throw upErr;
			const { data } = supabase.storage.from("journal").getPublicUrl(path);
			return data.publicUrl ?? null;
		} catch (e: any) {
			setError(e.message ?? "Failed to upload photo");
			return null;
		}
	}

	async function onAttachPhoto(entryId: string, file: File) {
		const url = await onUploadPhoto(file);
		if (!url) return;
		try {
			const res = await fetch(`/api/journal/${entryId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ photo_url: url }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error ?? "Failed to attach photo");
			}
			setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, photo_url: url } : e)));
		} catch (err: any) {
			setError(err.message ?? "Failed to attach photo");
		}
	}

	return (
		<div className="space-y-4">
			<form onSubmit={onSubmit} className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
				<label htmlFor="note" className="text-sm font-semibold text-emerald-900">
					Add a note
				</label>
				<textarea
					id="note"
					value={note}
					onChange={(e) => setNote(e.target.value)}
					rows={3}
					placeholder="Watered today, moved to brighter spot, noticed new growth…"
					className="mt-2 w-full rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-900 outline-none ring-emerald-200 focus:ring-2"
					maxLength={5000}
				/>
				<div className="mt-3 flex flex-wrap items-center gap-3">
					<button
						type="submit"
						disabled={submitting || !note.trim()}
						className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
					>
						{submitting ? "Adding…" : "Add note"}
					</button>
					<button
						type="button"
						onClick={() => onQuickAdd("Watered today")}
						className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
					>
						Watered
					</button>
					<button
						type="button"
						onClick={() => onQuickAdd("Fertilized today")}
						className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
					>
						Fertilized
					</button>
					{error ? <span className="text-sm text-rose-700">{error}</span> : null}
				</div>
			</form>

			<div className="space-y-3">
				<h3 className="text-lg font-semibold text-gray-900">Notes</h3>
				{loading ? (
					<p className="text-sm text-gray-600">Loading…</p>
				) : entries.length === 0 ? (
					<p className="text-sm text-gray-600">No notes yet. Start the journal above.</p>
				) : (
					<ul className="space-y-3">
						{entries.map((entry) => (
							<li key={entry.id} className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm">
								<div className="flex items-center justify-between gap-3">
									<p className="text-sm text-gray-500">{formatRelative(entry.created_at)}</p>
									<div className="flex items-center gap-2">
										<InlineEdit initial={entry.body} onSave={(v) => onEdit(entry.id, v)} />
										<label className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-emerald-800">
											<input
												type="file"
												accept="image/*"
												className="hidden"
												onChange={(e) => {
													const f = e.target.files?.[0];
													if (f) onAttachPhoto(entry.id, f);
												}}
											/>
											<span className="rounded-lg border border-emerald-200 bg-white px-2 py-1 hover:bg-emerald-50">Attach photo</span>
										</label>
										<button
											type="button"
											onClick={() => onDelete(entry.id)}
											className="rounded-lg border border-rose-200 bg-white px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
										>
											Delete
										</button>
									</div>
								</div>
								<p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{entry.body}</p>
								{entry.photo_url ? (
									<div className="relative mt-3 h-60 w-full overflow-hidden rounded-xl">
										<Image src={entry.photo_url} alt="" fill className="object-cover" />
									</div>
								) : null}
							</li>
						))}
					</ul>
				)}
				{nextCursor ? (
					<div className="pt-2">
						<button
							type="button"
							onClick={() => load(false)}
							className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
						>
							Load more
						</button>
					</div>
				) : null}
			</div>
		</div>
	);
}

function InlineEdit({ initial, onSave }: { initial: string; onSave: (value: string) => Promise<void> | void }) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(initial);
	const [saving, setSaving] = useState(false);

	useEffect(() => setValue(initial), [initial]);

	async function save() {
		setSaving(true);
		await onSave(value.trim());
		setSaving(false);
		setEditing(false);
	}

	if (!editing) {
		return (
			<button
				type="button"
				onClick={() => setEditing(true)}
				className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
			>
				Edit
			</button>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<input
				type="text"
				value={value}
				onChange={(e) => setValue(e.target.value)}
				className="w-48 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs text-emerald-900 outline-none ring-emerald-200 focus:ring-2"
			/>
			<button
				type="button"
				onClick={save}
				disabled={saving}
				className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
			>
				{saving ? "Saving…" : "Save"}
			</button>
			<button
				type="button"
				onClick={() => setEditing(false)}
				className="rounded-lg border border-emerald-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
			>
				Cancel
			</button>
		</div>
	);
}


