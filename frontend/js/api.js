// api.js - Handles PDF parsing and backend communication

// Wait for PDF.js to be ready
function waitForPDFjs() {
    return new Promise((resolve) => {
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (typeof pdfjsLib !== 'undefined') {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// API Service Object
const API = {
    /**
     * Upload PDF to backend server
     * @param {File} file - The PDF file to upload
     * @returns {Promise<Response>} - Server response
     */
    async uploadToBackend(file) {
        const formData = new FormData();
        formData.append("pdf", file);

        try {
            const response = await fetch("http://localhost:3000/upload", {
                method: "POST",
                body: formData
            });
            return response;
        } catch (error) {
            console.error("Backend upload error:", error);
            // Don't throw - allow local processing to continue even if backend fails
            return null;
        }
    },

    /**
     * Extract text content from PDF file using PDF.js (client-side)
     * @param {File} file - The PDF file to parse
     * @returns {Promise<string>} - Extracted text content
     */
    async extractPDFText(file) {
        await waitForPDFjs();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const tokenizedText = await page.getTextContent();
                fullText += tokenizedText.items.map(token => token.str).join(" ") + "\n";
            }

            return fullText;
        } catch (error) {
            console.error("PDF extraction error:", error);
            throw new Error("Failed to extract text from PDF");
        }
    }
};