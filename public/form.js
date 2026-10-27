"use strict"

const api = window.location.origin.includes("localhost") ? "http://localhost:3000" : window.location.origin;

const form = document.querySelector("form");
form.addEventListener("submit", async (e) => {
    try {
        e.preventDefault();
        const message = form.querySelector("textarea").value;
        if (!message) {
            const errorMessage = form.querySelector(".error-message");
            errorMessage.classList.remove("hidden");
            errorMessage.innerHTML = "Please enter a message before sending.";
            return;
        }
        const errorMessage = form.querySelector(".error-message");
        errorMessage.classList.add("hidden");

        const button = document.querySelector(".button")
        button.disabled = true;
        button.style.cursor = "progress"
        button.style.backgroundColor = "gray";

        const responseData = await fetch(`${api}/api/submit`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message })
        });

        const response = await responseData.json();

        const goodMessage = form.querySelector(".good-message");
        goodMessage.classList.remove("hidden");
        goodMessage.innerHTML = response.message;
        form.querySelector("textarea").value = "";

        button.disabled = false;
        button.style.cursor = "pointer";
        button.style.backgroundColor = "";

        setTimeout(() => {
            goodMessage.classList.add("hidden");
        }, 3000);
    } catch (error) {
        console.log(error.message, 'Error occured while sending message');
    }
});