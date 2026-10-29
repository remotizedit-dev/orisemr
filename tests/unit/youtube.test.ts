import { describe, it, expect } from "vitest";
import { extractYouTubeVideoId, formatYouTubeEmbedUrl } from "@/lib/youtube";

describe("YouTube Utility Functions", () => {
  it("extracts ID from standard watch URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=shared")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from shortened youtu.be URL", () => {
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ?si=abc123xyz")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from YouTube Shorts URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from embed URL", () => {
    expect(extractYouTubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts ID from full <iframe> embed tag snippet", () => {
    const iframeSnippet =
      '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allowfullscreen></iframe>';
    expect(extractYouTubeVideoId(iframeSnippet)).toBe("dQw4w9WgXcQ");
  });

  it("extracts raw 11-character video ID", () => {
    expect(extractYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("returns null for invalid inputs", () => {
    expect(extractYouTubeVideoId("")).toBeNull();
    expect(extractYouTubeVideoId("   ")).toBeNull();
    expect(extractYouTubeVideoId("https://example.com/not-youtube")).toBeNull();
  });

  it("formats clean embed URL", () => {
    expect(formatYouTubeEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ?rel=0"
    );
  });
});

