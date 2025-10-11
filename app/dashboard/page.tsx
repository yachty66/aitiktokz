// Redirect dashboard root to /dashboard/slideshows
import { redirect } from "next/navigation";

export default function DashboardIndexRedirect() {
  redirect("/dashboard/slideshows");
}
