import Link from "next/link";

type PlantCardProps = {
  plant: {
    id: string;
    nickname: string | null;
    image_url: string | null;
    species: {
      common_name: string | null;
      scientific_name: string | null;
      care_summary?: string | null;
      care_difficulty?: string | null;
    } | null;
  };
};

export default function PlantCard({ plant }: PlantCardProps) {
  const displayName = plant.nickname ?? plant.species?.common_name ?? "Unnamed plant";
  const difficulty = plant.species?.care_difficulty;
  const summary = plant.species?.care_summary;

  return (
    <Link
      href={`/plants/${plant.id}`}
      className="group block h-full rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <img
        src={plant.image_url ?? "/logo.svg"}
        alt={displayName}
        className="h-40 w-full rounded-xl object-cover"
      />
      <div className="mt-4 space-y-1">
        <div className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700">{displayName}</div>
        <div className="text-sm text-gray-600 italic">{plant.species?.scientific_name ?? "Species unknown"}</div>
        {difficulty && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            {difficulty}
          </span>
        )}
        {summary && <p className="text-sm text-gray-600">{summary}</p>}
      </div>
    </Link>
  );
}
