import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { DashboardHeader } from "@/components/layout/dashboard-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/" });
  };

  return (
    <DashboardHeader
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      signOutAction={signOutAction}
    >
      {children}
    </DashboardHeader>
  );
}
