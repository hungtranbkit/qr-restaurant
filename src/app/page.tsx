import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { roleHomePath } from "@/lib/auth/role-home";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  redirect(roleHomePath(user.role));
}
