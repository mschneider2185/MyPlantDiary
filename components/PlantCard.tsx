export default function PlantCard({ plant }: { plant: any }) {
  return (
    <div className="rounded-xl border p-4">
      <img src={plant.image_url ?? "/logo.svg"} alt={plant.id} className="h-40 w-full rounded object-cover" />
      <div className="mt-3">
        <div className="font-medium">{plant.nickname ?? plant.species?.common_name ?? "Unknown"}</div>
        <div className="text-sm text-gray-600">{plant.species?.scientific_name ?? ""}</div>
      </div>
    </div>
  );
}
