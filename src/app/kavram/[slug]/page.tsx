import { permanentRedirect } from "next/navigation";
import { GRAPH } from "@/lib/knowledge/registry";

export function generateStaticParams() {
  return Object.keys(GRAPH.concepts).map((slug) => ({ slug }));
}

export default function ConceptDetailPage() {
  permanentRedirect("/bilim");
}
