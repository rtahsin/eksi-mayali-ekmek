import type { MDXComponents } from "mdx/types";
import { Claim } from "@/components/editorial/Claim";
import { Concept } from "@/components/editorial/Concept";
import { Figure } from "@/components/editorial/Figure";
import { Video } from "@/components/editorial/Video";
import { Sources } from "@/components/editorial/Sources";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Claim,
    Concept,
    Figure,
    Video,
    Sources,
  };
}
