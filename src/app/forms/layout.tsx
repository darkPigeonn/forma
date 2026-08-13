import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function FormsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell userName={user.name} userEmail={user.email}>
      {children}
    </AppShell>
  );
}
