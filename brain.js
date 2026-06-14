// Micro-interactions for buttons
document.querySelectorAll('.neo-button-push').forEach(button => {
    button.addEventListener('mousedown', () => {
        button.classList.add('translate-x-[4px]', 'translate-y-[4px]');
        if (button.classList.contains('neo-brutal-shadow-primary')) {
            button.style.boxShadow = '0px 0px 0px 0px #494bd6';
        }
    });
    button.addEventListener('mouseup', () => {
        button.classList.remove('translate-x-[4px]', 'translate-y-[4px]');
        button.style.boxShadow = '';
    });
    button.addEventListener('mouseleave', () => {
        button.classList.remove('translate-x-[4px]', 'translate-y-[4px]');
        button.style.boxShadow = '';
    });
});

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

// ==========================================
// 1. THE MASTER ANSWER KEY
// Populate this object with the official IAT Key
// Format: "QuestionID": "CorrectOption"
// ==========================================
const masterAnswerKey = {
    "9272331386": "3", // Q1
    "9272331394": "4", // Q2
    "9272331392": "4", // Q3 (Confirmed via your previous image)
    "9272331390": "3", // Q4
    "9272331384": "3", // Q5
    "9272331381": "4", // Q6
    "9272331395": "1", // Q7
    "9272331389": "3", // Q8
    "9272331387": "2", // Q9
    "9272331391": "1", // Q10
    "9272331382": "2", // Q11
    "9272331393": "2", // Q12
    "9272331388": "3", // Q13
    "9272331385": "2", // Q14 (Confirmed via your previous image)
    "9272331383": "4", // Q15
    "9272331405": "4", // Q16
    "9272331408": "2", // Q17
    "9272331407": "1", // Q18
    "9272331396": "4", // Q19
    "9272331400": "2", // Q20
    "9272331403": "2", // Q21
    "9272331406": "1", // Q22
    "9272331402": "4", // Q23 (Manual Override applied. See note below.)
    "9272331399": "1", // Q24
    "9272331401": "1", // Q25
    "9272331409": "2", // Q26
    "9272331398": "3", // Q27
    "9272331404": "1", // Q28
    "9272331410": "1", // Q29
    "9272331397": "1", // Q30
    "9272331421": "2", // Q31
    "9272331411": "2", // Q32
    "9272331413": "3", // Q33
    "9272331420": "1", // Q34
    "9272331412": "4", // Q35
    "9272331415": "2", // Q36
    "9272331417": "4", // Q37
    "9272331414": "3", // Q38
    "9272331423": "3", // Q39
    "9272331422": "3", // Q40
    "9272331418": "4", // Q41
    "9272331419": "2", // Q42
    "9272331424": "4", // Q43
    "9272331425": "2", // Q44
    "9272331416": "1", // Q45
    "9272331434": "4", // Q46
    "9272331429": "3", // Q47
    "9272331439": "2", // Q48
    "9272331430": "2", // Q49
    "9272331431": "1", // Q50
    "9272331440": "2", // Q51
    "9272331432": "2", // Q52
    "9272331435": "3", // Q53
    "9272331438": "3", // Q54
    "9272331427": "3", // Q55
    "9272331436": "2", // Q56
    "9272331428": "2", // Q57
    "9272331437": "1", // Q58
    "9272331426": "2", // Q59
    "9272331433": "1"  // Q60  // Example mapping
    // Add all 60 question mappings here...
};

const pdfInput = document.getElementById('pdfInput');
const pdfText = document.getElementById('pdf-text');
const btnIcon = document.getElementById('btn-icon');
const uploadIcon = document.getElementById('upload-icon');
const uploadIconContainer = document.getElementById('upload-icon-container');
const dashboard = document.getElementById('dashboard');

// 2. Handle PDF Upload and Extraction
pdfInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    pdfText.innerText = "Analyzing document...";
    btnIcon.innerText = "hourglass_empty";
    uploadIcon.innerText = "sync";
    uploadIcon.classList.add("animate-spin");
    dashboard.style.display = "none";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const tokenizedText = await page.getTextContent();
            fullText += tokenizedText.items.map(token => token.str).join(" ") + "\n";
        }

        calculateScore(fullText);
        pdfText.innerText = "Evaluation Complete";
        btnIcon.innerText = "check_circle";
        uploadIcon.innerText = "task_alt";
    } catch (error) {
        console.error(error);
        alert("Error parsing PDF. Please ensure you uploaded the correct Digialm file.");
        pdfText.innerText = "Processing Failed";
        btnIcon.innerText = "error";
        uploadIcon.innerText = "error";
    } finally {
        uploadIcon.classList.remove("animate-spin");
    }
});

// 3. Logic to Parse and Compare
function calculateScore(text) {
    // This regex looks for "Question ID: [number]" followed by "Chosen Option: [number or --]"
    // [\s\S]*? ensures it jumps over any weird spaces or page breaks between the two lines
    const qaRegex = /Question\s*ID\s*:\s*(\d+)[\s\S]*?Chosen\s*Option\s*:\s*(\d+|--)/gi;

    let match;
    let score = 0, correct = 0, wrong = 0, attempted = 0;
    let matchedQuestionsCount = 0;

    // Loop through every instance found in the PDF
    while ((match = qaRegex.exec(text)) !== null) {
        matchedQuestionsCount++;
        const qId = match[1].trim();
        const chosenOption = match[2].trim();

        // Check if the user actually attempted it
        if (chosenOption !== '--') {
            attempted++;
            const correctOption = masterAnswerKey[qId];

            // Check against the master key
            if (correctOption) {
                if (chosenOption === correctOption) {
                    score += 4;
                    correct++;
                } else {
                    score -= 1;
                    wrong++;
                }
            } else {
                console.warn(`Question ID ${qId} is missing from the masterAnswerKey object.`);
            }
        }
    }

    if (matchedQuestionsCount === 0) {
        alert("Could not identify any Question IDs in the file. Make sure it's the official response sheet.");
        return;
    }

    // 4. Update the UI Dashboard
    document.getElementById('totalScore').innerText = score;
    document.getElementById('totalCorrect').innerText = correct;
    document.getElementById('totalWrong').innerText = wrong;
    document.getElementById('totalAttempted').innerText = attempted;
    
    // Set dynamic remark
    const remarkEl = document.getElementById('scoreRemark');
    if (score > 180) {
        remarkEl.innerText = "EXCELLENT";
        remarkEl.style.color = "var(--success)";
    } else if (score > 120) {
        remarkEl.innerText = "GOOD";
        remarkEl.style.color = "var(--primary)";
    } else {
        remarkEl.innerText = "NEEDS IMPROVEMENT";
        remarkEl.style.color = "var(--error)";
    }

    dashboard.style.display = 'block';
}
