// preloader.js - Handles the preloader animation
document.addEventListener("DOMContentLoaded", () => {
    const preloader = document.getElementById('preloader');
    const textElement = document.getElementById('preloader-text');
    const targetText = "THE MOCK LAB";
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:',.<>?/`~";
    let iterations = 0;
    const maxIterations = 40;
    const intervalTime = 40;

    const interval = setInterval(() => {
        if (textElement) {
            textElement.innerText = targetText.split("").map((char, index) => {
                if (char === " ") return " ";
                if (index < iterations / (maxIterations / targetText.length)) {
                    return targetText[index];
                }
                return chars[Math.floor(Math.random() * chars.length)];
            }).join("");
        }

        if (iterations >= maxIterations) {
            clearInterval(interval);
            if (textElement) textElement.innerText = targetText;
            setTimeout(() => {
                if (preloader) {
                    preloader.classList.add('fade-out');
                    setTimeout(() => {
                        if (preloader) preloader.style.display = 'none';
                    }, 800);
                }
            }, 800);
        }
        iterations++;
    }, intervalTime);
});