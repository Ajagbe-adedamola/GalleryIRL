import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapExperience } from "@/components/MapExperience";
import { getDataset } from "@/lib/data";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const dataset = await getDataset();
  const place = dataset.places.find((item) => item.slug === slug);
  if (!place) return { title: "Place not found · Lagos Street Culture Map" };
  return {
    title: `${place.name} · Lagos Street Culture Map`,
    description: place.description ?? `${place.neighbourhood}, Lagos.`,
    openGraph: {
      title: place.name,
      description: place.description ?? `${place.neighbourhood}, Lagos.`,
      images: place.images[0] ? [place.images[0]] : undefined,
    },
  };
}

export default async function PlacePage({ params }: PageProps) {
  const { slug } = await params;
  const dataset = await getDataset();
  const place = dataset.places.find((item) => item.slug === slug);
  if (!place) notFound();

  return (
    <MapExperience
      places={dataset.places}
      routes={dataset.routes}
      sample={dataset.sample}
      degraded={dataset.degraded}
      initialSlug={slug}
    />
  );
}
