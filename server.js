import express from "express";
import fileUpload from "express-fileupload";
import { Resend } from 'resend';
import "dotenv/config";
import { readFileSync } from "fs";

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
app.use(fileUpload());

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

        const resend = new Resend(process.env.RESEND_KEY);

        const { data, error } = await resend.emails.send({
            from: `Elder Ekeoma's Igbotomma 2026 <whistleblower@admin.nepalgroupng.com>`,
            to: ['helpdesk@nepalgroupng.com'],
            subject: `Elder Ekeoma's Igbotomma 2026`,
            html: `<p> ${req.body.message} </p>`,
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