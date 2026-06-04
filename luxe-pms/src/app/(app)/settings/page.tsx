import { redirect } from "next/navigation";

// Settings has been merged into the unified Configuration page (/setup).
export default function SettingsPage() {
  redirect("/setup");
}
