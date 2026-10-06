import type { MDXComponents } from "mdx/types";
import { Claim } from "@/components/editorial/Claim";
import { Concept } from "@/components/editorial/Concept";
import { Figure } from "@/components/editorial/Figure";
import { Video } from "@/components/editorial/Video";
import { Sources } from "@/components/editorial/Sources";
import { Micro } from "@/components/editorial/Micro";
import { Predict } from "@/components/editorial/Predict";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Claim,
    Concept,
    Figure,
    Video,
    Sources,
    Micro,
    Predict,
  };
}
