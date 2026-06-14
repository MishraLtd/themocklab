const supabase =
    require("./services/supabase");
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const parseCandidateInfo =
    require("./services/parseCandidateInfo");
const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({
    storage: multer.memoryStorage()
});


app.get("/", (req, res) => {
    res.send("Backend Running");
});

app.post("/upload", upload.single("pdf"), async (req, res) => {
    try {
        const dataBuffer =
            req.file.buffer;

        const pdfData = await pdfParse(dataBuffer);
        const candidateInfo =
            parseCandidateInfo(pdfData.text);

        // console.log("===== PDF TEXT =====");
        //console.log(pdfData.text);
        //console.log("====================");

        res.json(candidateInfo);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post("/save-result", async (req, res) => {

    const {
        candidateName,
        rollNumber,
        testDate,
        testCenter,
        marks
    } = req.body;

    const { data, error } =
        await supabase
            .from("candidates")
            .upsert(
                {
                    candidate_name: candidateName,
                    roll_number: rollNumber,
                    test_date: testDate,
                    test_center: testCenter,
                    marks: marks
                },
                {
                    onConflict: "roll_number"
                }
            )
            .select();

    res.json({
        data,
        error
    });

});
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
