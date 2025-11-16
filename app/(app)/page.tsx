import { redirect } from "next/navigation";
import UploadPlantImage from "@/components/UploadPlantImage";
import PlantCard from "@/components/PlantCard";
import EmptyState from "@/components/EmptyState";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: plants, error } = await supabase
    .from("plants")
    .select(
      `
        id,
        nickname,
        image_url,
        created_at,
        species:species(
          id,
          common_name,
          scientific_name,
          care_summary,
          care_difficulty
        )
      `
    )
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dashboard] failed to load plants", error);
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">Your Plants</h1>
      <div className="mt-4">
        <UploadPlantImage />
      </div>
      {!plants || plants.length === 0 ? (
        <EmptyState title="No plants yet" description="Upload a photo to identify and add a plant." />
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}
    </main>
  );
}
