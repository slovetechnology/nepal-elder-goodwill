"use strict"

const api = window.location.origin.includes("localhost") ? "http://localhost:3000" : window.location.origin;

const form = document.querySelector("form");
const name_input = document.querySelector("#sender-name");
const img_input = document.querySelector("#image-upload");
let img = document.querySelector(".image-upload");
let img_placeholder = document.querySelector(".image-upload-placeholder");
const doc_input = document.querySelector("#document-upload");
const doc_placeholder = document.querySelector(".document-upload-placeholder");
const doc_preview = document.querySelector(".document-preview");
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx"];
const button = document.querySelector(".button");
const errorMessage = form.querySelector(".error-message");

const editor = new Quill("#editor", {
    theme: "snow",
    placeholder: "Write your message here. Take your time...",
    modules: {
        toolbar: [
            [{ header: [2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "link"],
            ["clean"],
        ],
    },
});
editor.root.setAttribute("aria-label", "Your goodwill message");
editor.root.setAttribute("role", "textbox");
editor.root.setAttribute("aria-multiline", "true");

const showError = (text) => {
    errorMessage.classList.remove("hidden");
    errorMessage.textContent = text;
};
const hideError = () => errorMessage.classList.add("hidden");

const setLoading = (loading) => {
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
    button.setAttribute("aria-busy", String(loading));
};

const formatSize = (bytes) => bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const resetImage = () => {
    img_input.value = "";
    img.src = "";
    img.style.display = "";
    img_placeholder.classList.remove("hidden");
};

const resetDocument = () => {
    doc_input.value = "";
    doc_preview.classList.add("hidden");
    doc_placeholder.classList.remove("hidden");
};

img_input.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
        if (e.target.files[0].size > MAX_IMAGE_SIZE) {
            resetImage();
            showError("This image is a little too large. Please choose one under 2MB.");
            return;
        }
        hideError();
        const reader = new FileReader();
        reader.onload = (event) => {
            img_placeholder.classList.add("hidden");
            img.style.display = "block";
            img.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
})

doc_input.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop().toLowerCase();
    if (!DOCUMENT_EXTENSIONS.includes(ext)) {
        resetDocument();
        showError("Please attach a PDF or Word document (.pdf, .doc or .docx).");
        return;
    }
    if (file.size > MAX_DOCUMENT_SIZE) {
        resetDocument();
        showError("This document is a little too large. Please choose one under 5MB.");
        return;
    }
    hideError();

    doc_preview.querySelector(".document-badge").textContent = ext.toUpperCase();
    doc_preview.querySelector(".document-name").textContent = file.name;
    doc_preview.querySelector(".document-name").title = file.name;
    doc_preview.querySelector(".document-size").textContent = formatSize(file.size);
    doc_placeholder.classList.add("hidden");
    doc_preview.classList.remove("hidden");
});

doc_preview.querySelector(".document-remove").addEventListener("click", resetDocument);

form.addEventListener("submit", async (e) => {
    try {
        e.preventDefault();
        const name = name_input.value.trim();
        if (!name) {
            showError("Please tell us your name before sending.");
            name_input.focus();
            return;
        }
        if (!editor.getText().trim()) {
            showError("Please write a short message before sending.");
            editor.focus();
            return;
        }
        hideError();

        setLoading(true);

        const formData = new FormData();
        formData.append("name", name);
        formData.append("message", editor.getSemanticHTML());
        if (img_input.files[0]) formData.append("image", img_input.files[0]);
        if (doc_input.files[0]) formData.append("document", doc_input.files[0]);

        const responseData = await fetch(`${api}/api/submit`, {
            method: "POST",
            body: formData
        });

        const response = await responseData.json();

        if (!responseData.ok) {
            showError(response.message);
            return;
        }

        const goodMessage = form.querySelector(".good-message");
        goodMessage.classList.remove("hidden");
        goodMessage.textContent = response.message;
        name_input.value = "";
        editor.setContents([]);
        resetImage();
        resetDocument();

        setTimeout(() => {
            goodMessage.classList.add("hidden");
        }, 8000);
    } catch (error) {
        console.log(error.message, 'Error occured while sending message');
        showError("We couldn't send your message just now. Please check your connection and try again.");
    } finally {
        setLoading(false);
    }
});
