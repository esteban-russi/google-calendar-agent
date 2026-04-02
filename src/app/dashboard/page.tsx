import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import CountdownDashboard from "@/components/CountdownDashboard";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return <CountdownDashboard />;
}
