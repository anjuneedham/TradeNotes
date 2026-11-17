import { James } from "@/components/James";
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-sm px-4 py-16"><James pose="wave" size={80} className="mx-auto mb-4 text-fg" />{children}</div>;
}
