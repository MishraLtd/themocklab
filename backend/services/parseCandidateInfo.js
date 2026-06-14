function parseCandidateInfo(text) {

    const rollMatch =
        text.match(/Roll No\s*(IAT\d+)/);

    const nameMatch =
        text.match(/Applicant Name\s*([A-Z ]+)/);

    const dateMatch =
        text.match(/Test Date\s*([0-9\/]+)/);

    const centerMatch =
        text.match(
            /Test Center\s*Name\s*([\s\S]*?)\s*Test Date/
        );

    return {
        candidateName:
            nameMatch?.[1]?.trim() || null,

        rollNumber:
            rollMatch?.[1] || null,
        testDate:
            dateMatch?.[1] || null,
        testCenter:
            centerMatch?.[1]
                ?.replace(/\s+/g, " ")
                ?.trim() || null
    };
}

module.exports = parseCandidateInfo;