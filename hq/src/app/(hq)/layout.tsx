import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { logout, requireOwner } from "@/lib/auth";

export default async function HqLayout({ children }: { children: React.ReactNode }) {
  await requireOwner();
  async function doLogout() { "use server"; await logout(); redirect("/login"); }
  return (
    <>
      <Nav logout={doLogout} />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">{children}</main>
    </>
  );
}
