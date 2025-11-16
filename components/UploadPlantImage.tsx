"use client";
import { useState } from "react";
import Link from "next/link";

type IdentificationResult = {
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
  raw: unknown;
};

type SpeciesProfile = {
  id: string;
  common_name: string | null;
  scientific_name: string | null;
  care_summary: string | null;
  care_difficulty: string | null;
  watering: string | null;
  sunlight: string | null;
  temperature_range: string | null;
  temperature_notes: string | null;
  humidity: string | null;
  soil_type: string | null;
  soil_mix: string[] | null;
  soil_ph_min: number | null;
  soil_ph_max: number | null;
  care_tips: string[] | null;
  profile_generated_at: string | null;
};

type PlantRecord = {
  id: string;
  nickname: string | null;
  image_url: string | null;
  species: {
    id: string;
    common_name: string | null;
    scientific_name: string | null;
  } | null;
};

const formatConfidence = (value: number | null) => {
  if (value == null) return null;
  return `${Math.round(value * 100)}% match`;
};

export default function UploadPlantImage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [species, setSpecies] = useState<SpeciesProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPlant, setSavedPlant] = useState<PlantRecord | null>(null);

  const sanitizedSoilMix =
    species?.soil_mix?.filter((mix) => {
      const trimmed = mix?.trim();
      return trimmed && trimmed.toLowerCase() !== "string";
    }) ?? [];
  const soilMixDisplay =
    sanitizedSoilMix.length > 0 ? sanitizedSoilMix : ["coco coir", "orchid bark", "perlite"];
  const careTips =
    species?.care_tips?.filter((tip) => {
      const trimmed = tip?.trim();
      return trimmed && trimmed.toLowerCase() !== "string";
    }) ?? [];

  async function ensureJpegOrPng(dataUrl: string): Promise<string> {
    // If already jpeg or png, return as-is
    const mimeMatch = /^data:(?<mime>[^;]+);base64,/.exec(dataUrl);
    const mime = mimeMatch?.groups?.mime ?? "";
    if (mime === "image/jpeg" || mime === "image/png") return dataUrl;

    // Convert other formats (e.g., webp/heic) to jpeg client-side
    // by drawing to a canvas and exporting as JPEG.
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const loaded = new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load image for conversion."));
      });
      img.src = dataUrl;
      await loaded;

      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to create canvas context.");
      ctx.drawImage(img, 0, 0);
      // Use high-quality JPEG to preserve details
      const converted = canvas.toDataURL("image/jpeg", 0.95);
      return converted;
    } catch {
      // Fall back to original if conversion fails
      return dataUrl;
    }
  }

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const raw = reader.result as string;
      const safe = await ensureJpegOrPng(raw);
      setImage(safe);
    };
    reader.readAsDataURL(file);
    setResult(null);
    setSpecies(null);
    setError(null);
    setNickname("");
    setSaveError(null);
    setSavedPlant(null);
  };

  const onIdentify = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    setShowRaw(false);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: image }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to identify plant right now.");
      }

      const data = (await res.json()) as {
        result?: IdentificationResult;
        species?: SpeciesProfile | null;
      };
      if (!data.result) {
        throw new Error("Plant identification did not return a result.");
      }
      setResult(data.result);
      setSpecies(data.species ?? null);
      setSavedPlant(null);
      setSaveError(null);
      setNickname(data.result.plant.commonName ?? "");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setResult(null);
      setSpecies(null);
      setSavedPlant(null);
      setSaveError(null);
    } finally {
      setLoading(false);
    }
  };

  const onSavePlant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!species) return;
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speciesId: species.id,
          nickname: nickname.trim() || undefined,
          imageBase64: image ?? undefined,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to save plant.");
      }

      const data = (await res.json()) as { plant: PlantRecord };
      setSavedPlant(data.plant);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save plant.";
      setSaveError(message);
      setSavedPlant(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <input type="file" accept="image/*" onChange={onChange} />
          <button
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:pointer-events-none disabled:opacity-50"
            onClick={onIdentify}
            disabled={!image || loading}
          >
            {loading ? "Identifying..." : "Identify"}
          </button>
        </div>
        {result && (
          <button
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
            onClick={() => setShowRaw((prev) => !prev)}
            type="button"
          >
            {showRaw ? "Hide raw response" : "Show raw response"}
          </button>
        )}
      </div>

      {image && (
        <div className="mt-5">
          <img src={image} alt="Uploaded plant" className="max-h-80 w-full rounded-2xl object-cover" />
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mt-6 space-y-6">
          <section className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
                  Likely match
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-emerald-900">
                  {result.plant.commonName ?? "Unknown plant"}
                </h2>
                {result.plant.scientificName && (
                  <p className="text-sm italic text-gray-700">{result.plant.scientificName}</p>
                )}
              </div>
              {formatConfidence(result.plant.confidence) && (
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-sm font-semibold text-emerald-700 shadow">
                  {formatConfidence(result.plant.confidence)}
                </span>
              )}
            </div>

            <dl className="mt-4 grid gap-3 text-sm text-emerald-800 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/70 p-3">
                <dt className="text-emerald-700">Family</dt>
                <dd className="mt-1 font-semibold">
                  {result.plant.family ?? "Not provided"}
                </dd>
              </div>
              <div className="rounded-2xl bg-white/70 p-3">
                <dt className="text-emerald-700">Genus</dt>
                <dd className="mt-1 font-semibold">
                  {result.plant.genus ?? "Not provided"}
                </dd>
              </div>
              <div className="rounded-2xl bg-white/70 p-3 sm:col-span-2">
                <dt className="text-emerald-700">Notes</dt>
                <dd className="mt-1 text-emerald-900">
                  {result.plant.notes ?? "No notes returned for this match."}
                </dd>
              </div>
            </dl>
          </section>

          {species && (
            <section className="space-y-5 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Care snapshot</h3>
                  <p className="text-sm text-gray-600">
                    {species.care_summary ??
                      "We generated a quick care overview based on this match to help you get started."}
                  </p>
                </div>
                {species.care_difficulty && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800">
                    {species.care_difficulty}
                  </span>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-emerald-50 bg-emerald-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Watering</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    {species.watering ?? "Allow soil to dry slightly between waterings."}
                  </p>
                </article>
                <article className="rounded-2xl border border-emerald-50 bg-emerald-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Sunlight</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    {species.sunlight ?? "Bright, indirect light is a safe bet indoors."}
                  </p>
                </article>
                <article className="rounded-2xl border border-emerald-50 bg-emerald-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Temperature</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-900">
                    {species.temperature_range ?? "65-80°F"}
                  </p>
                  <p className="mt-1 text-xs text-emerald-700">
                    {species.temperature_notes ?? "Avoid cold drafts and sudden temperature swings."}
                  </p>
                </article>
                <article className="rounded-2xl border border-emerald-50 bg-emerald-50/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Humidity</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    {species.humidity ?? "Average indoor humidity works; extra misting is a bonus."}
                  </p>
                </article>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Soil mix</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {soilMixDisplay.map((mix) => (
                      <span
                        key={mix}
                        className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm"
                      >
                        {mix}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-emerald-700">
                    {species.soil_type ?? "Choose a well-draining potting mix with chunky amendments."}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Soil pH</p>
                  <p className="mt-2 text-sm font-semibold text-emerald-900">
                    {species.soil_ph_min != null && species.soil_ph_max != null
                      ? `${species.soil_ph_min.toFixed(1)} – ${species.soil_ph_max.toFixed(1)}`
                      : "6.0 – 7.0"}
                  </p>
                  <p className="mt-2 text-xs text-emerald-700">
                    Aim for a lightly acidic to neutral potting mix for best nutrient uptake.
                  </p>
                </div>
              </div>

              {careTips.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Pro tips</p>
                  <ul className="grid gap-3 md:grid-cols-2">
                    {careTips.map((tip) => (
                      <li key={tip} className="rounded-2xl border border-emerald-100 bg-white p-3 text-sm text-gray-700 shadow-sm">
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {species.profile_generated_at && (
                <p className="text-xs text-gray-500">
                  Care profile refreshed{" "}
                  {new Date(species.profile_generated_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                  .
                </p>
              )}

              <form onSubmit={onSavePlant} className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div>
                  <label htmlFor="nickname" className="text-xs uppercase tracking-wide text-emerald-700">
                    Plant nickname
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    placeholder="e.g. Kitchen Shelf Pothos"
                    className="mt-2 w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:pointer-events-none disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save to My Plants"}
                  </button>
                  {savedPlant && (
                    <Link
                      href={`/plants/${savedPlant.id}`}
                      className="text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      View plant →
                    </Link>
                  )}
                </div>
                {saveError && <p className="text-xs text-rose-600">{saveError}</p>}
                {!saveError && savedPlant && (
                  <p className="text-xs text-emerald-700">Saved to your garden!</p>
                )}
              </form>
            </section>
          )}

          {result.alternatives.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">Other possible matches</h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {result.alternatives.map((alt, idx) => (
                  <li key={`${alt.scientificName ?? idx}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-gray-900">
                      {alt.commonName ?? alt.scientificName ?? "Unknown"}
                    </div>
                    {alt.scientificName && (
                      <div className="text-xs italic text-gray-600">{alt.scientificName}</div>
                    )}
                    {alt.confidence != null && (
                      <div className="mt-2 text-xs font-medium text-emerald-600">
                        {formatConfidence(alt.confidence)}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {showRaw && (
            <pre className="max-h-96 overflow-auto rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-700">
              {JSON.stringify(result.raw, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
