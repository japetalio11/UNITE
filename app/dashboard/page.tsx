import { redirect } from "next/navigation";

export default function DashboardPage() {
  // Redirect to campaign page as the dashboard default
  redirect("/dashboard/campaign");
}
