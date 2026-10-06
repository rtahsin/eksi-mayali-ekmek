import type { KnowledgeGraph, ClaimInput, SourceInput, ConceptInput } from "./types";
import type { ContentRef, GraphIssue } from "./refs";
import { claimHash } from "./define";
import { findHealthTerms, hasBenefitVerb } from "./lint";

const DOI_REGEX = /^10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function validateGraph(
  graph: KnowledgeGraph,
  refs: readonly ContentRef[] = []
): GraphIssue[] {
  const issues: GraphIssue[] = [];

  const sourceKeys = Object.keys(graph.sources);
  const claimKeys = Object.keys(graph.claims);
  const conceptKeys = Object.keys(graph.concepts);

  // K001: Yinelenen kimlik (farklı gruplar arasında aynı kimlik kullanılamaz)
  const allKeys = new Map<string, string>();
  for (const id of sourceKeys) {
    if (allKeys.has(id)) {
      issues.push({ code: "K001", severity: "error", ref: id, message: `Yinelenen kimlik: ${id}` });
    } else {
      allKeys.set(id, "source");
    }
  }
  for (const id of claimKeys) {
    if (allKeys.has(id)) {
      issues.push({ code: "K001", severity: "error", ref: id, message: `Yinelenen kimlik: ${id}` });
    } else {
      allKeys.set(id, "claim");
    }
  }
  for (const id of conceptKeys) {
    if (allKeys.has(id)) {
      issues.push({ code: "K001", severity: "error", ref: id, message: `Yinelenen kimlik: ${id}` });
    } else {
      allKeys.set(id, "concept");
    }
  }

  // K004: DOI biçimi / doğrulama tarihi kontrolü
  for (const [id, source] of Object.entries(graph.sources)) {
    if (source.doi && !DOI_REGEX.test(source.doi)) {
      issues.push({ code: "K004", severity: "error", ref: id, message: `Geçersiz DOI biçimi: ${source.doi}` });
    }
    if (!source.verified?.at || !DATE_REGEX.test(source.verified.at)) {
      issues.push({ code: "K004", severity: "error", ref: id, message: `Doğrulama tarihi yok veya geçersiz: ${source.verified?.at}` });
    }
  }

  // Kavramların referans sayımı (K008 için)
  const conceptClaimCounts = new Map<string, number>();
  for (const id of conceptKeys) {
    conceptClaimCounts.set(id, 0);
  }

  // İddia denetimleri (K002, K003, K006, K011)
  for (const [id, claim] of Object.entries(graph.claims)) {
    // K003: Kanıtsız iddia
    if (!claim.evidence || claim.evidence.length === 0) {
      issues.push({ code: "K003", severity: "error", ref: id, message: `Kanıtsız iddia: ${id}` });
    } else {
      // K002: Evidence içindeki kaynak kontrolü
      for (const ev of claim.evidence) {
        if (!graph.sources[ev.source]) {
          issues.push({ code: "K002", severity: "error", ref: id, message: `Kopuk kaynak referansı: ${ev.source}` });
        }
      }
    }

    // K002: About içindeki kavram kontrolü
    if (Array.isArray(claim.about)) {
      for (const cpt of claim.about) {
        if (!graph.concepts[cpt]) {
          issues.push({ code: "K002", severity: "error", ref: id, message: `Kopuk kavram referansı: ${cpt}` });
        } else {
          conceptClaimCounts.set(cpt, (conceptClaimCounts.get(cpt) || 0) + 1);
        }
      }
    }

    // K002: supersededBy kontrolü
    if (claim.supersededBy && !graph.claims[claim.supersededBy]) {
      issues.push({ code: "K002", severity: "error", ref: id, message: `Kopuk supersededBy referansı: ${claim.supersededBy}` });
    }

    // K006: Sağlık terimi ve beyanı kontrolü
    const healthTermsFound = findHealthTerms(claim.text);
    if (healthTermsFound.length > 0) {
      if (claim.status !== "efsane") {
        const hasBenefit = hasBenefitVerb(claim.text) || claim.sensitivity === "saglik";
        if (hasBenefit && !claim.legalCheck) {
          issues.push({
            code: "K006",
            severity: "error",
            ref: id,
            message: `Sağlık/fayda iddiası legalCheck olmadan kullanılamaz: ${healthTermsFound.join(", ")}`,
          });
        }
      }
    }

    // K011: review.hash uyuşmazlığı
    if (claim.review) {
      const currentHash = claimHash(claim);
      if (claim.review.hash !== currentHash) {
        issues.push({
          code: "K011",
          severity: "error",
          ref: id,
          message: `Onay özeti güncel metinle uyuşmuyor (beklenen ${currentHash}, kayıtlı ${claim.review.hash})`,
        });
      }
    }
  }

  // Kavram denetimleri (K002, K008)
  for (const [id, concept] of Object.entries(graph.concepts)) {
    if (concept.parent && !graph.concepts[concept.parent]) {
      issues.push({ code: "K002", severity: "error", ref: id, message: `Kopuk üst kavram referansı: ${concept.parent}` });
    }

    if (concept.identity) {
      for (const item of concept.identity) {
        if (item.claim && !graph.claims[item.claim]) {
          issues.push({ code: "K002", severity: "error", ref: id, message: `Kopuk identity iddia referansı: ${item.claim}` });
        }
      }
    }

    // K008: İddiasız kavram (uyarı)
    const claimCount = conceptClaimCounts.get(id) || 0;
    if (claimCount === 0) {
      issues.push({ code: "K008", severity: "warn", ref: id, message: `İddiasız kavram: ${id}` });
    }
  }

  // İçerik referansları denetimi (K002, K005, K006)
  for (const ref of refs) {
    for (const cId of ref.claimIds) {
      const claim = graph.claims[cId];
      if (!claim) {
        issues.push({ code: "K002", severity: "error", ref: ref.id, message: `Kopuk iddia referansı: ${cId}` });
        continue;
      }

      // K005: Yayındaki içerik review: null, geri_cekildi ya da supersededBy kullanamaz
      if (ref.status === "yayinda") {
        if (!claim.review) {
          issues.push({ code: "K005", severity: "error", ref: ref.id, message: `Yayındaki içerik onaylanmamış iddia kullanıyor: ${cId}` });
        }
        if (claim.status === "geri_cekildi") {
          issues.push({ code: "K005", severity: "error", ref: ref.id, message: `Yayındaki içerik geri çekilmiş iddia kullanıyor: ${cId}` });
        }
        if (claim.supersededBy) {
          issues.push({ code: "K005", severity: "error", ref: ref.id, message: `Yayındaki içerik güncelliğini yitirmiş (supersededBy) iddia kullanıyor: ${cId}` });
        }
      }

      // K006: Ürün yüzeyinde sağlık terimi her durumda yasaktır
      if (ref.surface === "urun") {
        const terms = findHealthTerms(claim.text);
        if (terms.length > 0) {
          issues.push({
            code: "K006",
            severity: "error",
            ref: ref.id,
            message: `Ürün yüzeyinde sağlık terimi kullanılamaz: ${terms.join(", ")}`,
          });
        }
      }
    }

    for (const cptId of ref.conceptIds) {
      if (!graph.concepts[cptId]) {
        issues.push({ code: "K002", severity: "error", ref: ref.id, message: `Kopuk kavram referansı: ${cptId}` });
      }
    }

    if (ref.surface === "urun" && ref.text) {
      const terms = findHealthTerms(ref.text);
      if (terms.length > 0) {
        issues.push({
          code: "K006",
          severity: "error",
          ref: ref.id,
          message: `Ürün yüzeyinde sağlık terimi kullanılamaz: ${terms.join(", ")}`,
        });
      }
    }

    // K009: Yazı özeti > 160 karakter ya da levels boş
    if (ref.kind === "yazi") {
      if (ref.summary && ref.summary.length > 160) {
        issues.push({
          code: "K009",
          severity: "error",
          ref: ref.id,
          message: `Yazı özeti 160 karakteri aşıyor (${ref.summary.length} karakter): ${ref.id}`,
        });
      }
      if (!ref.levels || ref.levels.length === 0) {
        issues.push({
          code: "K009",
          severity: "error",
          ref: ref.id,
          message: `Yazı hedef kitle seviyesi (levels) boş olamaz: ${ref.id}`,
        });
      }
    }
  }

  return issues;
}
