import { describe, expect, it } from "vitest";
import { containsTerm, findCue, parseCaptions, parseTimestamp, shouldEmphasize, wrapCaption } from "./captions";

describe("caption parsing", () => {
  it("parses WebVTT cues, settings, voices, and entities", () => {
    const result = parseCaptions(`WEBVTT\n\nintro\n00:00:01.250 --> 00:00:03.500 align:center\n<v Alex>Fish &amp; chips</v>\n\nNOTE ignore me\nthis is not a cue\n\n00:04.000 --> 00:05.200\nNext line`);
    expect(result).toEqual([
      { id: "intro", start: 1.25, end: 3.5, text: "Fish & chips" },
      { id: "2", start: 4, end: 5.2, text: "Next line" }
    ]);
  });

  it("parses SubRip timestamps and multiline cues", () => {
    const result = parseCaptions(`1\r\n00:00:00,500 --> 00:00:02,000\r\nWhere did she go?\r\nI missed that.\r\n\r\n2\r\n00:01:02,010 --> 00:01:04,000\r\nThere.`);
    expect(result).toHaveLength(2);
    expect(result[0]?.text).toBe("Where did she go?\nI missed that.");
    expect(result[1]?.start).toBe(62.01);
  });

  it("rejects empty or unusable files with useful errors", () => {
    expect(() => parseCaptions("  ")).toThrow("empty");
    expect(() => parseCaptions("not captions")).toThrow("No usable cues");
    expect(() => parseCaptions("1\n00:00:02,000 --> 00:00:01,000\nBackwards")).toThrow("No usable cues");
  });

  it("validates timestamps", () => {
    expect(parseTimestamp("01:02:03.045")).toBe(3723.045);
    expect(parseTimestamp("02:03,100")).toBe(123.1);
    expect(parseTimestamp("00:61.000")).toBeNull();
  });
});

describe("caption shaping", () => {
  const cues = [
    { id: "a", start: 0, end: 2, text: "First" },
    { id: "b", start: 2, end: 4, text: "Second" }
  ];

  it("finds active cues with an exclusive end time", () => {
    expect(findCue(cues, 0)?.id).toBe("a");
    expect(findCue(cues, 1.999)?.id).toBe("a");
    expect(findCue(cues, 2)?.id).toBe("b");
    expect(findCue(cues, 4)).toBeNull();
  });

  it("wraps on words without losing content", () => {
    expect(wrapCaption("A short caption needs room", 12)).toEqual(["A short", "caption", "needs room"]);
    expect(wrapCaption("Line one\nLine two", 30)).toEqual(["Line one", "Line two"]);
  });

  it("always marks user terms and scales the visible heuristic", () => {
    expect(shouldEmphasize("Fifteen,", ["fifteen"], "terms")).toBe(true);
    expect(shouldEmphasize("the", [], "terms")).toBe(false);
    expect(shouldEmphasize("the", [], "guided")).toBe(true);
    expect(shouldEmphasize("soft", [], "more")).toBe(true);
  });

  it("finds whole terms safely, including punctuation", () => {
    expect(containsTerm("At fifteen, leave.", ["fifteen"])).toBe(true);
    expect(containsTerm("Fifty is different", ["fifteen"])).toBe(false);
    expect(containsTerm("Use C++ today", ["C++"])).toBe(true);
  });
});
