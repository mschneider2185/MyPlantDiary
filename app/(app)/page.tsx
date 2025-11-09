import UploadPlantImage from "@/components/UploadPlantImage";
import PlantCard from "@/components/PlantCard";
import EmptyState from "@/components/EmptyState";

export default async function DashboardPage() {
  // Placeholder for SSR user session and initial plants fetch
  const plants: any[] = [];

  return (
    <main>
      <h1 className="text-2xl font-semibold">Your Plants</h1>
      <div className="mt-4">
        <UploadPlantImage />
      </div>
      {plants.length === 0 ? (
        <EmptyState title="No plants yet" description="Upload a photo to identify and add a plant." />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((p) => (
            <PlantCard key={p.id} plant={p} />
          ))}
        </div>
      )}
    </main>
  );
}
