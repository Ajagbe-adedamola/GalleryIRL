import { MapExperience } from "@/components/MapExperience";
import { getDataset } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dataset = await getDataset();
  return (
    <MapExperience
      places={dataset.places}
      routes={dataset.routes}
      sample={dataset.sample}
      degraded={dataset.degraded}
    />
  );
}
