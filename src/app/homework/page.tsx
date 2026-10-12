import { HomeworkStart } from "@/components/homework-start";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  return <HomeworkStart childId={(await searchParams).child} />;
}
