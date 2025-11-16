"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PlantActionsProps = {
	plantId: string;
	currentNickname: string | null;
};

export default function PlantActions({ plantId, currentNickname }: PlantActionsProps) {
	const router = useRouter();
	const [nickname, setNickname] = useState<string>(currentNickname ?? "");
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSaveNickname(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		setError(null);
		try {
			const res = await fetch(`/api/plants/${plantId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ nickname: nickname.trim() === "" ? null : nickname.trim() }),
			});
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error ?? "Failed to save");
			}
			router.refresh();
		} catch (err: any) {
			setError(err.message ?? "Failed to save");
		} finally {
			setSaving(false);
		}
	}

	async function onDelete() {
		if (!confirm("Delete this plant? This cannot be undone.")) return;
		setDeleting(true);
		setError(null);
		try {
			const res = await fetch(`/api/plants/${plantId}`, { method: "DELETE" });
			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				throw new Error(data?.error ?? "Failed to delete");
			}
			// Go back to dashboard
			router.push("/");
			router.refresh();
		} catch (err: any) {
			setError(err.message ?? "Failed to delete");
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-4">
			<form onSubmit={onSaveNickname} className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<label className="text-sm font-medium text-emerald-900" htmlFor="nickname">
					Nickname
				</label>
				<input
					id="nickname"
					type="text"
					value={nickname}
					onChange={(e) => setNickname(e.target.value)}
					placeholder="e.g., Sunny, Fernie"
					className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 outline-none ring-emerald-200 focus:ring-2 sm:max-w-xs"
					maxLength={120}
				/>
				<button
					type="submit"
					disabled={saving}
					className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
				>
					{saving ? "Saving…" : "Save"}
				</button>
				<button
					type="button"
					onClick={onDelete}
					disabled={deleting}
					className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
				>
					{deleting ? "Deleting…" : "Delete plant"}
				</button>
			</form>
			{error ? <p className="mt-2 text-sm text-rose-700">{error}</p> : null}
		</div>
	);
}


