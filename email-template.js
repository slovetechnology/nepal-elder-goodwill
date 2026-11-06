// Builds the goodwill email. Email clients (Gmail especially) ignore most <style> rules,
// so everything is styled inline on a table layout.

const BRAND = "#da373d";
const INK = "#27272a";
const MUTED = "#71717a";
const FONT = "Georgia, 'Times New Roman', serif";
const UI_FONT = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const BLOCK_STYLES = {
    p: `margin:0 0 18px;font-family:${FONT};font-size:17px;line-height:1.75;color:${INK};`,
    h2: `margin:28px 0 12px;font-family:${FONT};font-size:22px;line-height:1.35;color:#18181b;`,
    h3: `margin:24px 0 10px;font-family:${FONT};font-size:19px;line-height:1.4;color:#18181b;`,
    blockquote: `margin:0 0 18px;padding:4px 0 4px 18px;border-left:3px solid ${BRAND};font-family:${FONT};font-size:17px;line-height:1.75;color:#52525b;font-style:italic;`,
    ul: `margin:0 0 18px;padding-left:24px;`,
    ol: `margin:0 0 18px;padding-left:24px;`,
    li: `margin:0 0 8px;font-family:${FONT};font-size:17px;line-height:1.7;color:${INK};`,
};

const escapeHtml = (text) => text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// Quill 2.0.3 emits &nbsp; for every space which stops lines wrapping in mail clients
const normaliseSpaces = (html) => html.replace(/(&nbsp;| )/g, " ");

// a message without any block tags (plain text) is split into paragraphs on its line breaks
const ensureParagraphs = (html) => {
    if (/<(p|h2|h3|ul|ol|blockquote)\b/i.test(html)) return html;
    return html
        .split(/\r?\n\s*\r?\n/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => `<p>${part.replace(/\r?\n/g, "<br>")}</p>`)
        .join("");
};

// input is already sanitized, so tags are bare (only <a> carries attributes)
const styleBlocks = (html) => html
    .replace(/<(p|h2|h3|blockquote|ul|ol|li)>/g, (_, tag) => `<${tag} style="${BLOCK_STYLES[tag]}">`)
    .replace(/<a /g, `<a style="color:${BRAND};text-decoration:underline;" `)
    // paragraphs already have spacing, so blank lines from pressing Enter twice are dropped
    .replace(/<p style="[^"]*">\s*(<br\s*\/?>\s*)*<\/p>/g, "");

const toPlainText = (html) => html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "  • ")
    .replace(/<\/(p|h2|h3|blockquote|li|ul|ol)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

/**
 * @param {object} opts
 * @param {string} opts.name        sender name, plain text
 * @param {string} opts.messageHtml sanitized message html
 * @param {boolean} opts.hasImage   inline image attached with contentId "goodwill-image"
 * @param {string} [opts.documentName] attached document file name
 */
export const buildGoodwillEmail = ({ name, messageHtml, hasImage, documentName }) => {
    const body = styleBlocks(ensureParagraphs(normaliseSpaces(messageHtml)));
    const safeName = escapeHtml(name);
    const sentAt = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Lagos" });

    const imageBlock = hasImage ? `
        <tr><td style="padding:8px 40px 8px;">
            <img src="cid:goodwill-image" alt="Image shared by ${safeName}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:10px;border:1px solid #e4e4e7;" />
        </td></tr>` : "";

    const documentBlock = documentName ? `
        <tr><td style="padding:8px 40px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;background:#fafafa;">
                <tr><td style="padding:14px 16px;font-family:${UI_FONT};font-size:14px;color:${INK};">
                    <span style="display:inline-block;padding:3px 7px;margin-right:8px;border-radius:5px;background:#fbe3e4;color:${BRAND};font-size:11px;font-weight:700;letter-spacing:.5px;">${escapeHtml(documentName.split(".").pop().toUpperCase())}</span>
                    ${escapeHtml(documentName)}
                    <div style="margin-top:4px;font-size:12px;color:${MUTED};">Attached to this email</div>
                </td></tr>
            </table>
        </td></tr>` : "";

    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Goodwill message from ${safeName}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:28px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e4e4e7;">
        <tr><td style="height:5px;background:${BRAND};background-image:linear-gradient(90deg,${BRAND},#e8a33d);font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:32px 40px 8px;font-family:${UI_FONT};">
            <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND};">Goodwill message</div>
            <div style="margin-top:6px;font-size:22px;font-weight:800;color:#18181b;">Elder Ekeoma's Igbotomma 2026</div>
        </td></tr>
        <tr><td style="padding:16px 40px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f0f0f1;border-bottom:1px solid #f0f0f1;">
                <tr><td style="padding:14px 0;font-family:${UI_FONT};font-size:14px;color:${MUTED};">
                    From <strong style="color:#18181b;font-size:15px;">${safeName}</strong>
                    <span style="color:#d4d4d8;">&nbsp;·&nbsp;</span>${sentAt}
                </td></tr>
            </table>
        </td></tr>
        <tr><td style="padding:0 40px 10px;">${body}</td></tr>
        ${imageBlock}
        ${documentBlock}
        <tr><td style="padding:24px 40px 32px;font-family:${UI_FONT};font-size:12px;color:#a1a1aa;">
            Sent through the Elder Ekeoma's Igbotomma 2026 goodwill message form.
        </td></tr>
    </table>
</td></tr>
</table>
</body>
</html>`;

    const text = [
        `Goodwill message for Elder Ekeoma's Igbotomma 2026`,
        `From: ${name} (${sentAt})`,
        "",
        toPlainText(ensureParagraphs(normaliseSpaces(messageHtml))),
        documentName ? `\nAttached document: ${documentName}` : "",
    ].join("\n").trim();

    return { html, text };
};
