/**
 * Robust YouTube video URL and ID parser.
 * Handles standard watch URLs, short URLs, embeds, shorts, live streams,
 * raw 11-char IDs, and accidental <iframe> snippet pastes from non-technical users.
 */
export function extractYouTubeVideoId(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 1. If user accidentally pasted the whole <iframe> code snippet from YouTube "Share -> Embed"
  const iframeMatch = trimmed.match(/src=["']([^"']+)["']/i);
  const target = iframeMatch ? iframeMatch[1] : trimmed;

  // 2. If it's a raw 11-character YouTube video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(target)) {
    return target;
  }

  // 3. Match all common YouTube URL formats
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = target.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Returns a clean, embeddable YouTube URL with safe defaults.
 */
export function formatYouTubeEmbedUrl(
  input: string | null | undefined,
  fallbackId = "dQw4w9WgXcQ"
): string {
  const videoId = extractYouTubeVideoId(input) || fallbackId;
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

