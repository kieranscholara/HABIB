import { TutorRoom } from "@/components/tutor-room";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; scan?: string }>;
}) {
  const params = await searchParams;
  return (
    <TutorRoom
      key={params.session}
      sessionId={params.session || ""}
      scan={params.scan === "1"}
    />
  );
}
