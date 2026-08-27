export interface CaptionCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

const timestampPattern = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{3})$/;

export function parseTimestamp(value: string): number | null {
  const match = value.trim().match(timestampPattern);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function decodeCaptionText(text: string): string {
  return text
    .replace(/<\/?(?:c(?:\.[^ >]+)?|v(?: [^>]+)?|lang(?: [^>]+)?|b|i|u|ruby|rt)>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lrm;|&rlm;/gi, "")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

export function parseCaptions(source: string): CaptionCue[] {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new Error("The caption file is empty.");

  const body = normalized.replace(/^WEBVTT(?:[^\n]*)\n+/i, "");
  const blocks = body.split(/\n{2,}/);
  const cues: CaptionCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    if (!lines.length || /^NOTE(?:\s|$)/i.test(lines[0] ?? "") || /^STYLE(?:\s|$)/i.test(lines[0] ?? "")) continue;

    const timingIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex]?.split(/\s+-->\s+/);
    if (!timing || timing.length !== 2) continue;
    const start = parseTimestamp(timing[0] ?? "");
    const end = parseTimestamp((timing[1] ?? "").split(/\s+/)[0] ?? "");
    if (start === null || end === null || end <= start) continue;

    const text = decodeCaptionText(lines.slice(timingIndex + 1).join("\n")).trim();
    if (!text) continue;
    cues.push({
      id: timingIndex === 1 ? (lines[0] ?? String(cues.length + 1)) : String(cues.length + 1),
      start,
      end,
      text
    });
  }

  if (!cues.length) {
    throw new Error("No usable cues were found. Choose a WebVTT (.vtt) or SubRip (.srt) file with timestamps.");
  }
  return cues.sort((a, b) => a.start - b.start);
}

export function findCue(cues: CaptionCue[], time: number): CaptionCue | null {
  let low = 0;
  let high = cues.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const cue = cues[middle];
    if (!cue) break;
    if (time < cue.start) high = middle - 1;
    else if (time >= cue.end) low = middle + 1;
    else return cue;
  }
  return null;
}

export function wrapCaption(text: string, maximum: number): string[] {
  const lines: string[] = [];
  for (const sourceLine of text.split("\n")) {
    const words = sourceLine.trim().split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      if (!current) current = word;
      else if (`${current} ${word}`.length <= maximum) current += ` ${word}`;
      else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

const blurTokens = ["s", "f", "th", "sh", "ch", "t", "k", "p"];
const smallConnectors = new Set(["a", "an", "and", "are", "as", "at", "be", "but", "by", "can", "did", "do", "for", "from", "had", "has", "have", "he", "her", "him", "his", "if", "in", "is", "it", "may", "my", "no", "not", "of", "on", "or", "our", "she", "so", "than", "that", "the", "their", "them", "then", "they", "this", "to", "up", "was", "we", "were", "what", "when", "who", "will", "with", "would", "you", "your"]);

export type EmphasisLevel = "terms" | "guided" | "more";

export function shouldEmphasize(word: string, terms: string[], level: EmphasisLevel): boolean {
  const clean = word.toLocaleLowerCase().replace(/^\W+|\W+$/g, "");
  if (!clean) return false;
  if (terms.some((term) => term.toLocaleLowerCase() === clean)) return true;
  if (level === "terms") return false;
  const consonantScore = blurTokens.reduce((score, token) => score + (clean.includes(token) ? 1 : 0), 0);
  if (level === "guided") return smallConnectors.has(clean) || (clean.length >= 5 && clean.length <= 9 && consonantScore >= 2);
  return smallConnectors.has(clean) || (clean.length >= 4 && consonantScore >= 1);
}

export function containsTerm(text: string, terms: string[]): boolean {
  const lowered = text.toLocaleLowerCase();
  return terms.some((term) => {
    const needle = term.trim().toLocaleLowerCase();
    if (!needle) return false;
    return new RegExp(`(^|\\W)${escapeRegExp(needle)}(?=\\W|$)`, "iu").test(lowered);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
