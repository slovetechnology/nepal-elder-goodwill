import express from "express";
import fileUpload from "express-fileupload";
import { Resend } from 'resend';
import "dotenv/config";
import { readFileSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import sanitizeHtml from "sanitize-html";
import { buildGoodwillEmail } from "./email-template.js";

const app = express();

// behind a proxy (Render, Nginx, etc.) so req.protocol reflects https
app.set("trust proxy", true);

app.use(express.json());

// serve index.html with absolute URLs filled in, link previews need them for og:image
const sendIndex = (req, res) => {
    const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;
    const indexHtml = readFileSync("public/index.html", "utf8");
    res.type("html").send(indexHtml.replaceAll("%SITE_URL%", siteUrl.replace(/\/$/, "")));
};
app.get(["/", "/index.html"], sendIndex);

app.use(express.static("public"));
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const ATTACHMENTS_DIR = "public/attachments";
const IMAGE_EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp" };

// documents are identified by their leading bytes, browsers report inconsistent mimetypes for .doc/.docx
const DOCUMENT_TYPES = {
    ".pdf": { contentType: "application/pdf", signature: [0x25, 0x50, 0x44, 0x46] }, // %PDF
    ".docx": { contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", signature: [0x50, 0x4b, 0x03, 0x04] }, // zip
    ".doc": { contentType: "application/msword", signature: [0xd0, 0xcf, 0x11, 0xe0] }, // OLE compound file
};
mkdirSync(ATTACHMENTS_DIR, { recursive: true });

// the editor sends HTML, only keep the formatting its toolbar can produce
const sanitizeMessage = (html) => sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h2", "h3", "blockquote", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
});

const hasText = (html) => sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).replace(/&nbsp;/g, " ").trim().length > 0;

// limit is the largest allowed file, each field is checked against its own size below
app.use(fileUpload({ limits: { fileSize: MAX_DOCUMENT_SIZE } }));

app.get("/api", (req, res) => {
    try {
        res.status(200).send(`Welcome to API Service`)
    } catch (error) {
        return res.status(500).json({
            message: error.message.toString()
        })
    }
});


// email sender
app.post("/api/submit", async (req, res) => {
    try {
        // name is plain text, collapse whitespace and escape it before it goes into the mail
        const name = String(req.body.name || "").replace(/\s+/g, " ").trim().slice(0, 100);
        if (!name) return res.status(400).json({ message: `Name is required` });

        const message = sanitizeMessage(String(req.body.message || ""));
        if (!hasText(message)) return res.status(400).json({ message: `Message is required` });

        // image is optional, validate and store it when present
        const image = req.files?.image;
        if (Array.isArray(image)) return res.status(400).json({ message: `Only one image can be uploaded` });

        // document is optional too, sent as a regular attachment
        const document = req.files?.document;
        if (Array.isArray(document)) return res.status(400).json({ message: `Only one document can be uploaded` });

        // validate everything before writing any file to disk
        let imageExt;
        if (image) {
            imageExt = IMAGE_EXTENSIONS[image.mimetype];
            if (!imageExt) return res.status(400).json({ message: `Image must be a JPG, PNG, GIF or WEBP file` });
            if (image.truncated || image.size > MAX_IMAGE_SIZE) return res.status(400).json({ message: `Image must not be more than 2MB` });
        }

        let documentExt, documentType;
        if (document) {
            documentExt = path.extname(document.name).toLowerCase();
            documentType = DOCUMENT_TYPES[documentExt];
            if (document.truncated || document.size > MAX_DOCUMENT_SIZE) return res.status(400).json({ message: `Document must not be more than 5MB` });
            if (!documentType || !documentType.signature.every((byte, i) => document.data[i] === byte)) {
                return res.status(400).json({ message: `Document must be a PDF, DOC or DOCX file` });
            }
        }

        let attachments = [];
        if (image) {
            const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${imageExt}`;
            await image.mv(path.join(ATTACHMENTS_DIR, filename));

            // inline attachment so the image shows in the mail body
            attachments.push({ filename, content: image.data, contentType: image.mimetype, contentId: "goodwill-image" });
        }

        let documentName;
        if (document) {
            const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${documentExt}`;
            await document.mv(path.join(ATTACHMENTS_DIR, filename));

            // keep the sender's file name in the mail, stripped to safe characters
            const displayName = path.basename(document.name, path.extname(document.name)).replace(/[^\w\- ]+/g, "_").slice(0, 80) || "document";
            documentName = `${displayName}${documentExt}`;
            attachments.push({ filename: documentName, content: document.data, contentType: documentType.contentType });
        }

        const { html, text } = buildGoodwillEmail({ name, messageHtml: message, hasImage: Boolean(image), documentName });

        const resend = new Resend(process.env.RESEND_KEY);

        const { data, error } = await resend.emails.send({
            from: `Elder Ekeoma's Igbotomma 2026 <whistleblower@admin.nepalgroupng.com>`,
            to: ['george@gowithgeo.com'],
            // to: ['helpdesk@nepalgroupng.com', 'george@gowithgeo.com'],
            subject: `Elder Ekeoma's Igbotomma 2026 - Goodwill message from ${name}`,
            html,
            text,
            attachments,
        });

        console.log(data, error, 'RESEND');
        if(error?.name === "validation_error") return res.status(400).json({ statusCode: Number(error.statusCode), message: error.message.toString() });


        return res.status(201).json({
            message: "Your message has been sent successfully."
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message.toString()
        })
    }
})

app.listen(3000, () => {
    console.log(`Server is running on http://localhost:3000`);
});
