// calculator.js - Contains answer key and score calculation logic

// Master Answer Key (extracted from original HTML)
const masterAnswerKey = {
    "9272331386": "3", "9272331394": "4", "9272331392": "4", "9272331390": "3",
    "9272331384": "3", "9272331381": "4", "9272331395": "1", "9272331389": "3",
    "9272331387": "2", "9272331391": "1", "9272331382": "2", "9272331393": "2",
    "9272331388": "3", "9272331385": "2", "9272331383": "4", "9272331405": "4",
    "9272331408": "2", "9272331407": "1", "9272331396": "4", "9272331400": "2",
    "9272331403": "2", "9272331406": "1", "9272331402": "4", "9272331399": "1",
    "9272331401": "1", "9272331409": "2", "9272331398": "3", "9272331404": "1",
    "9272331410": "1", "9272331397": "1", "9272331421": "2", "9272331411": "2",
    "9272331413": "3", "9272331420": "1", "9272331412": "4", "9272331415": "2",
    "9272331417": "4", "9272331414": "3", "9272331423": "3", "9272331422": "3",
    "9272331418": "4", "9272331419": "2", "9272331424": "4", "9272331425": "2",
    "9272331416": "1", "9272331434": "4", "9272331429": "3", "9272331439": "2",
    "9272331430": "2", "9272331431": "1", "9272331440": "2", "9272331432": "2",
    "9272331435": "3", "9272331438": "3", "9272331427": "3", "9272331436": "2",
    "9272331428": "2", "9272331437": "1", "9272331426": "2", "9272331433": "1"
};

// Calculator Service Object
const Calculator = {
    /**
     * Parse question data from PDF text and calculate scores
     * @param {string} text - Extracted text from PDF
     * @returns {Object} - Score results
     */
    calculateScore(text) {
        const qaRegex = /Question\s*ID\s*:\s*(\d+)[\s\S]*?Chosen\s*Option\s*:\s*(\d+|--)/gi;
        let match;
        let score = 0, correct = 0, wrong = 0, attempted = 0;
        let matchedQuestionsCount = 0;

        while ((match = qaRegex.exec(text)) !== null) {
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
                } else {
                    console.warn(`Question ID ${qId} not found in answer key.`);
                }
            }
        }

        return {
            totalScore: score,
            totalCorrect: correct,
            totalWrong: wrong,
            totalAttempted: attempted,
            matchedQuestionsCount: matchedQuestionsCount,
            hasValidData: matchedQuestionsCount > 0
        };
    },

    /**
     * Get remark based on score
     * @param {number} score - Total score
     * @returns {Object} - Remark text and color class
     */
    getScoreRemark(score) {
        if (score > 180) {
            return {
                text: "STATUS: EXCELLENT",
                color: "var(--secondary-fixed)"
            };
        } else if (score > 120) {
            return {
                text: "STATUS: NOMINAL",
                color: "var(--primary-fixed-dim)"
            };
        } else {
            return {
                text: "STATUS: SUB-OPTIMAL",
                color: "var(--error)"
            };
        }
    },

    /**
     * Update UI with calculated results
     * @param {Object} results - Results from calculateScore
     */
    updateUI(results) {
        document.getElementById('totalScore').innerText = results.totalScore;
        document.getElementById('totalCorrect').innerText = results.totalCorrect;
        document.getElementById('totalWrong').innerText = results.totalWrong;
        document.getElementById('totalAttempted').innerText = results.totalAttempted;

        const remark = this.getScoreRemark(results.totalScore);
        const remarkEl = document.getElementById('scoreRemark');
        remarkEl.innerText = remark.text;
        remarkEl.style.color = remark.color;
    }
};

// Export for use in other files (if using modules)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { masterAnswerKey, Calculator };
}