import { AuthForm } from "@/components/auth-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string }>;
}) {
  return (
    <AuthForm
      mode="confirm"
      tokenHash={(await searchParams).token_hash || ""}
    />
  );
}
