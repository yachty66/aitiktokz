// Redirect dashboard root to /dashboard/posts
import { redirect } from "next/navigation";

export default function DashboardIndexRedirect() {
  redirect("/dashboard/posts");
}
