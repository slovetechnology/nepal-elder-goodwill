"use strict"

const api = window.location.origin.includes("localhost") ? "http://localhost:3000" : window.location.origin;

const form = document.querySelector("form");
const img_input = document.querySelector("#image-upload");
let img = document.querySelector(".image-upload");
let img_placeholder = document.querySelector(".image-upload-placeholder");
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const button = document.querySelector(".button");

const setLoading = (loading) => {
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
    button.setAttribute("aria-busy", String(loading));
};

const resetImage = () => {
    img_input.value = "";
    img.src = "";
    img.style.display = "";
    img_placeholder.classList.remove("hidden");
};

img_input.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
        const errorMessage = form.querySelector(".error-message");
        if (e.target.files[0].size > MAX_IMAGE_SIZE) {
            resetImage();
            errorMessage.classList.remove("hidden");
            errorMessage.innerHTML = "This image is a little too large. Please choose one under 2MB.";
            return;
        }
        errorMessage.classList.add("hidden");
        const reader = new FileReader();
        reader.onload = (event) => {
            img_placeholder.classList.add("hidden");
            img.style.display = "block";
            img.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
    }
})

form.addEventListener("submit", async (e) => {
    try {
        e.preventDefault();
        const message = form.querySelector("textarea").value;
        if (!message) {
            const errorMessage = form.querySelector(".error-message");
            errorMessage.classList.remove("hidden");
            errorMessage.innerHTML = "Please write a short message before sending.";
            return;
        }
        const errorMessage = form.querySelector(".error-message");
        errorMessage.classList.add("hidden");

        setLoading(true);

        const formData = new FormData();
        formData.append("message", message);
        if (img_input.files[0]) formData.append("image", img_input.files[0]);

        const responseData = await fetch(`${api}/api/submit`, {
            method: "POST",
            body: formData
        });

        const response = await responseData.json();

        if (!responseData.ok) {
            errorMessage.classList.remove("hidden");
            errorMessage.innerHTML = response.message;
            return;
        }

        const goodMessage = form.querySelector(".good-message");
        goodMessage.classList.remove("hidden");
        goodMessage.innerHTML = response.message;
        form.querySelector("textarea").value = "";
        resetImage();

        setTimeout(() => {
            goodMessage.classList.add("hidden");
        }, 8000);
    } catch (error) {
        console.log(error.message, 'Error occured while sending message');
        const errorMessage = form.querySelector(".error-message");
        errorMessage.classList.remove("hidden");
        errorMessage.innerHTML = "We couldn't send your message just now. Please check your connection and try again.";
    } finally {
        setLoading(false);
    }
});