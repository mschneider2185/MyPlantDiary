import Link from "next/link";
import Image from "next/image";

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
      <div className="relative h-40 w-full overflow-hidden rounded-xl">
        <Image
          src={plant.image_url ?? "/logo.svg"}
          alt={displayName}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      </div>
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
