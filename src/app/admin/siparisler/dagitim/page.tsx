import { redirect } from "next/navigation";

/** Eski dağıtım ekranı kaldırıldı; teslimat tek ekranda: /kurye */
export default function DagitimRedirect() {
  redirect("/kurye");
}
