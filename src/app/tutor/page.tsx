import { TutorRoom } from "@/components/tutor-room";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  return <TutorRoom sessionId={(await searchParams).session || ""} />;
}
