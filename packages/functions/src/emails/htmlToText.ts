// Plain-text version of an HTML email, for text-only mail clients.
// Good enough for our own simple templates, not a general HTML parser.

const ENTITIES: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
};

export function htmlToText(html: string): string {
    return html
        // Source line breaks are just formatting in HTML; only tags make lines.
        .replace(/\s*\n\s*/g, ' ')
        .replace(/<(head|style|script)\b[\s\S]*?<\/\1>/gi, '')
        .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, text) => (text.trim() === href ? href : `${text} (${href})`))
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(h[1-6]|p|div|tr|li|table|section)>/gi, '\n')
        .replace(/<\/t[dh]>/gi, '\t')
        .replace(/<[^>]+>/g, '')
        .replace(/&[a-z]+;|&#\d+;/gi, (entity) => ENTITIES[entity] ?? entity)
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
