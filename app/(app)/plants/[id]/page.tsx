import Link from "next/link";
import { Droplets, Sun, Thermometer, Waves, Leaf, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type SpeciesProfile = {
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

type PlantDetailRecord = {
  id: string;
  nickname: string | null;
  image_url: string | null;
  species: SpeciesProfile | null;
};

type PlantDetail = {
  id: string;
  nickname: string | null;
  image_url: string | null;
  species: SpeciesProfile | null;
};

const FALLBACK_IMAGE = "/logo.svg";

export default async function PlantDetail({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("plants")
    .select(
      `
        id,
        nickname,
        image_url,
        species:species(
          id,
          common_name,
          scientific_name,
          family,
          origin,
          water_needs,
          light_needs,
          soil,
          humidity,
          temperature,
          about,
          care_summary,
          care_difficulty,
          watering,
          sunlight,
          temperature_range,
          temperature_notes,
          soil_type,
          soil_ph_min,
          soil_ph_max,
          soil_mix,
          care_tips,
          profile_generated_at,
          profile_source
        )
      `
    )
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return (
      <div className="space-y-6 py-10">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-sm text-emerald-900">
          We couldn't find that plant record. It may have been removed or never saved.
        </div>
        <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Back to your plants
        </Link>
      </div>
    );
  }

  const plantRow = data as PlantDetailRecord;
  const species = plantRow.species ?? null;

  if (!species) {
    return (
      <div className="space-y-6 py-10">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6 text-sm text-emerald-900">
          This plant doesn&apos;t have a species profile yet. Try identifying it again or add care notes manually.
        </div>
        <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700">
          ← Back to your plants
        </Link>
      </div>
    );
  }

  const plant: PlantDetail = {
    id: plantRow.id,
    nickname: plantRow.nickname,
    image_url: plantRow.image_url,
    species,
  };
  const displayName = plant.nickname ?? species.common_name ?? "Your plant";

  const careHighlights = [
    {
      icon: Droplets,
      label: "Watering",
      headline: species.water_needs ?? "Check soil first",
      description:
        species.watering ?? "Allow the top inch of soil to dry before watering again.",
    },
    {
      icon: Sun,
      label: "Sunlight",
      headline: species.light_needs ?? "Bright, indirect light",
      description:
        species.sunlight ??
        "Place near a bright window with filtered light. Avoid harsh direct sun.",
    },
    {
      icon: Thermometer,
      label: "Temperature",
      headline: species.temperature_range ?? "65-80°F",
      description:
        species.temperature_notes ??
        "Keep away from drafts. Growth slows when temperatures dip below 60°F.",
    },
    {
      icon: Waves,
      label: "Humidity",
      headline: species.humidity ?? "Average indoor humidity",
      description:
        "Most homes are fine, but a humidifier boosts growth during dry months.",
    },
  ];

  const phMin = species.soil_ph_min ?? null;
  const phMax = species.soil_ph_max ?? null;
  const hasPhRange = phMin != null && phMax != null;
  const phScaleMin = 4;
  const phScaleMax = 9;
  const phStartPercent = hasPhRange ? Math.max(0, Math.min(1, (phMin - phScaleMin) / (phScaleMax - phScaleMin))) : 0;
  const phEndPercent = hasPhRange ? Math.max(0, Math.min(1, (phMax - phScaleMin) / (phScaleMax - phScaleMin))) : 0.5;
  const phWidthPercent = Math.max(0.06, phEndPercent - phStartPercent);

  const difficultyLabel = species.care_difficulty ?? "Unknown difficulty";
  const generatedAt = species.profile_generated_at ? new Date(species.profile_generated_at) : null;
  const sanitizedSoilMix =
    species.soil_mix?.filter((item) => {
      const trimmed = item?.trim();
      return trimmed && trimmed.toLowerCase() !== "string";
    }) ?? [];
  const soilMixDisplay =
    sanitizedSoilMix.length > 0 ? sanitizedSoilMix : ["coco coir", "orchid bark", "perlite"];
  const careTips =
    species.care_tips?.filter((tip) => {
      const trimmed = tip?.trim();
      return trimmed && trimmed.toLowerCase() !== "string";
    }) ?? [];

  return (
    <div className="space-y-10 py-6">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700">
        ← Back to your plants
      </Link>

      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-md">
        <img
          src={plant.image_url ?? FALLBACK_IMAGE}
          alt={displayName}
          className="h-72 w-full object-cover md:h-[22rem]"
        />
        <div className="space-y-6 p-6 md:p-10">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-gray-900 md:text-4xl">{displayName}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                <Leaf className="h-4 w-4" />
                {difficultyLabel}
              </span>
            </div>
            {species.scientific_name ? (
              <p className="text-lg italic text-gray-600">{species.scientific_name}</p>
            ) : null}
            <p className="text-gray-700 leading-relaxed">
              {species.care_summary ??
                species.about ??
                "We’re gathering care notes for this plant. Add your own observations to the journal while we learn!"}
            </p>
            {generatedAt ? (
              <p className="text-sm text-gray-500">
                Profile refreshed {generatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            ) : null}
          </header>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Care requirements</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {careHighlights.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <Icon className="h-5 w-5" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide">{item.label}</h3>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-emerald-900">{item.headline}</p>
                    <p className="mt-2 text-sm text-emerald-800">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center gap-2 text-emerald-800">
              <Info className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-gray-900">Quick facts</h2>
            </div>
            <dl className="grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Common name</dt>
                <dd className="mt-1 text-base font-semibold text-gray-900">
                  {species.common_name ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Family</dt>
                <dd className="mt-1 text-base font-semibold text-gray-900">
                  {species.family ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Origin</dt>
                <dd className="mt-1 text-base font-semibold text-gray-900">
                  {species.origin ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-gray-500">Profile source</dt>
                <dd className="mt-1 text-base font-semibold text-gray-900">
                  {species.profile_source ? species.profile_source.toUpperCase() : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <Leaf className="h-5 w-5" />
              <h2 className="text-xl font-semibold text-gray-900">Soil preferences</h2>
            </div>
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50/50 p-6">
              <dl className="grid gap-4 text-sm text-gray-700 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <dt className="uppercase tracking-wide text-xs text-gray-500">Soil type</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {species.soil_type ?? species.soil ?? "Well-draining potting mix"}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="uppercase tracking-wide text-xs text-gray-500">pH level</dt>
                  <dd className="mt-1 text-base font-semibold text-gray-900">
                    {hasPhRange ? `${phMin?.toFixed(1)} – ${phMax?.toFixed(1)}` : "6.0 – 7.0"}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="uppercase tracking-wide text-xs text-gray-500">Recommended mix</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {soilMixDisplay.map((mix) => (
                      <span key={mix} className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow">
                        {mix}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
              <div className="mt-6">
                <div className="flex justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Acidic (4.0)</span>
                  <span>Neutral (7.0)</span>
                  <span>Alkaline (9.0)</span>
                </div>
                <div className="relative mt-2 h-2 rounded-full bg-emerald-100">
                  <div
                    className="absolute h-2 rounded-full bg-emerald-500"
                    style={{
                      left: `${phStartPercent * 100}%`,
                      width: `${phWidthPercent * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {careTips.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-xl font-semibold text-gray-900">Pro tips</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {careTips.map((tip) => (
                  <li key={tip} className="rounded-3xl border border-emerald-100 bg-white p-4 text-sm text-gray-700 shadow-sm">
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
