/**
 * Verifies that verbatim citations claimed by the AI actually exist in the source document.
 * This prevents hallucinations from masquerading as agreed terms.
 */

export interface CitationVerificationResult {
  allVerified: boolean;
  verifiedCount: number;
  unverifiedCitations: string[];
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”"']/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function verifyCitations(
  citations: string[],
  sourceDocument: string
): CitationVerificationResult {
  if (!citations || citations.length === 0) {
    return { allVerified: true, verifiedCount: 0, unverifiedCitations: [] };
  }

  const normalizedSource = normalize(sourceDocument);
  const unverified: string[] = [];
  let verifiedCount = 0;

  for (const citation of citations) {
    const cleaned = citation.trim();
    if (!cleaned) { unverified.push(citation); continue; }

    const normalizedCitation = normalize(cleaned);

    // Direct substring check
    if (normalizedSource.includes(normalizedCitation)) {
      verifiedCount++;
      continue;
    }

    // Tolerance for surrounding quote marks and trailing punctuation
    const strippedCitation = normalizedCitation.replace(/^[.,;:\s"']+|[.,;:\s"']+$/g, '');
    if (strippedCitation.length >= 10 && normalizedSource.includes(strippedCitation)) {
      verifiedCount++;
      continue;
    }

    unverified.push(citation);
  }

  return {
    allVerified: unverified.length === 0,
    verifiedCount,
    unverifiedCitations: unverified,
  };
}
