import express from "express";
import fileUpload from "express-fileupload";
import { Resend } from 'resend';
import "dotenv/config";
import { readFileSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";

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
const ATTACHMENTS_DIR = "public/attachments";
const IMAGE_EXTENSIONS = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp" };
mkdirSync(ATTACHMENTS_DIR, { recursive: true });

app.use(fileUpload({ limits: { fileSize: MAX_IMAGE_SIZE } }));

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
        if (!req.body.message) return res.status(404).json({ message: `Message is required` });

        // image is optional, validate and store it when present
        const image = req.files?.image;
        if (Array.isArray(image)) return res.status(400).json({ message: `Only one image can be uploaded` });

        let attachments = [];
        let imageHtml = "";
        if (image) {
            const ext = IMAGE_EXTENSIONS[image.mimetype];
            if (!ext) return res.status(400).json({ message: `Image must be a JPG, PNG, GIF or WEBP file` });
            if (image.truncated || image.size > MAX_IMAGE_SIZE) return res.status(400).json({ message: `Image must not be more than 2MB` });

            const filename = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;
            await image.mv(path.join(ATTACHMENTS_DIR, filename));

            // inline attachment so the image shows in the mail body
            attachments.push({ filename, content: image.data, contentType: image.mimetype, contentId: "goodwill-image" });
            imageHtml = `<p><img src="cid:goodwill-image" alt="Attached image" style="max-width:100%;height:auto;" /></p>`;
        }

        const resend = new Resend(process.env.RESEND_KEY);

        const { data, error } = await resend.emails.send({
            from: `Elder Ekeoma's Igbotomma 2026 <whistleblower@admin.nepalgroupng.com>`,
            to: ['helpdesk@nepalgroupng.com', 'george@gowithgeo.com'],
            subject: `Elder Ekeoma's Igbotomma 2026`,
            html: `<p> ${req.body.message} </p>${imageHtml}`,
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