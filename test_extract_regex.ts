export function extractPartyNames(display: string): [string | null, string | null] {
  const match = display.match(/([A-Z][A-Za-z\s&()\-'.,\u2019]*?)\s+v\.?\s+([A-Z][A-Za-z\s&()\-'.,\u2019]*?)(?=\s*[\[\(]|\s*\d{4}|\s*SA\b|\s*BCLR\b|\s*SACR\b|\s*All\s|\s*ZA[A-Z]|\s*CCT|\s*,?\s*\d{4}|\s*$)/);
  if (match) {
    return [match[1].trim(), match[2].trim()];
  }
  return [null, null];
}

console.log(extractPartyNames("Independent Institute of Education (Pty) Ltd v KwaZulu-Natal Law Society and Others 2020 (2) SA 325 (CC)"));
