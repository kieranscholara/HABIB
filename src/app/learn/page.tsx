import { Learn } from "@/components/learn";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  return <Learn childId={(await searchParams).child} />;
}
