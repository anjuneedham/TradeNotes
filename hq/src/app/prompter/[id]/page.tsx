import { notFound } from "next/navigation";
import { requireOwner } from "@/lib/auth";
import { getContent } from "@/lib/content-data";
import Prompter from "@/components/Prompter";

export const metadata = { title: "Teleprompter — HQ" };
export default async function PrompterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOwner();
  const { id } = await params; if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const it = await getContent(id); if (!it || !it.voiceover) notFound();
  return <Prompter hook={it.hook ?? it.title} text={it.voiceover} onScreen="Small on-screen text: “Not financial advice.” · Label demo data “SAMPLE DATA · NOT REAL TRADES”" />;
}
