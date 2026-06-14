// app.js - Main application logic

// Wait for DOM and all dependencies
window.addEventListener('load', () => {

    // DOM Elements
    const pdfInput = document.getElementById('pdfInput');
    const pdfText = document.getElementById('pdf-text');
    const uploadIcon = document.getElementById('upload-icon');
    const dashboard = document.getElementById('dashboard');

    async function processPDF(file) {
        if (!file) return;

        // Update UI
        pdfText.innerText = "PROCESSING DOCUMENT_UPLINK. AWAITING DATA EXTRACTION...";
        uploadIcon.innerText = "sync";
        uploadIcon.classList.add("animate-spin");
        dashboard.style.display = "none";

        try {
            // FIRST: Upload to backend (if server is running)
            const backendResponse = await API.uploadToBackend(file);
            if (backendResponse && backendResponse.ok) {
                console.log("PDF successfully uploaded to backend");
            } else {
                console.warn("Backend not reachable, continuing with local processing only");
            }

            // SECOND: Extract text locally using PDF.js
            const extractedText = await API.extractPDFText(file);

            // THIRD: Calculate scores
            const qaRegex = /Question\s*ID\s*:\s*(\d+)[\s\S]*?Chosen\s*Option\s*:\s*(\d+|--)/gi;
            let match;
            let score = 0, correct = 0, wrong = 0, attempted = 0;
            let matchedQuestionsCount = 0;

            while ((match = qaRegex.exec(extractedText)) !== null) {
                matchedQuestionsCount++;
                const qId = match[1].trim();
                const chosenOption = match[2].trim();

                if (chosenOption !== '--') {
                    attempted++;
                    const correctOption = masterAnswerKey[qId];
                    if (correctOption) {
                        if (chosenOption === correctOption) {
                            score += 4;
                            correct++;
                        } else {
                            score -= 1;
                            wrong++;
                        }
                    }
                }
            }

            if (matchedQuestionsCount === 0) {
                alert("Could not identify any Question IDs.");
                resetUI();
                return;
            }

            // Update dashboard
            document.getElementById('totalScore').innerText = score;
            document.getElementById('totalCorrect').innerText = correct;
            document.getElementById('totalWrong').innerText = wrong;
            document.getElementById('totalAttempted').innerText = attempted;

            const remarkEl = document.getElementById('scoreRemark');
            if (score > 180) {
                remarkEl.innerText = "STATUS: EXCELLENT";
                remarkEl.style.color = "var(--secondary-fixed)";
            } else if (score > 120) {
                remarkEl.innerText = "STATUS: NOMINAL";
                remarkEl.style.color = "var(--primary-fixed-dim)";
            } else {
                remarkEl.innerText = "STATUS: SUB-OPTIMAL";
                remarkEl.style.color = "var(--error)";
            }

            dashboard.style.display = 'block';
            pdfText.innerText = "DATA EXTRACTION COMPLETE. SYS READY FOR NEW INPUT.";
            uploadIcon.innerText = "task_alt";
            setTimeout(() => {
                if (uploadIcon.innerText === "task_alt") uploadIcon.innerText = "upload_file";
            }, 2000);

        } catch (error) {
            console.error(error);
            alert("Error parsing PDF. Please ensure you uploaded the correct file.");
            pdfText.innerText = "UPLINK FAILED. PLEASE RETRY WITH VALID PDF FORMAT.";
            uploadIcon.innerText = "error";
            setTimeout(() => {
                if (uploadIcon.innerText === "error") uploadIcon.innerText = "upload_file";
            }, 3000);
        } finally {
            uploadIcon.classList.remove("animate-spin");
        }
    }

    function resetUI() {
        dashboard.style.display = 'none';
        uploadIcon.innerText = "upload_file";
        uploadIcon.classList.remove("animate-spin");
    }

    // Event listener
    pdfInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) await processPDF(file);
    });

    // Trigger file input on button click
    const uploadBtn = document.querySelector('button.glitch-hover');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => pdfInput.click());
    }

    console.log("App ready - backend integration active");
});