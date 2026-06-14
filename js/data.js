// Mock Data for The Mock Lab
// Placeholders for database APIs

const MockDB = {
    exams: [
        { id: 'jee-main', name: 'JEE Main', icon: 'ph-atom' },
        { id: 'jee-adv', name: 'JEE Advanced', icon: 'ph-flask' },
        { id: 'neet', name: 'NEET', icon: 'ph-heartbeat' },
        { id: 'iat', name: 'IAT', icon: 'ph-dna' },
        { id: 'cuet', name: 'CUET', icon: 'ph-books' },
        { id: 'gate', name: 'GATE', icon: 'ph-cpu' },
        { id: 'cat', name: 'CAT', icon: 'ph-briefcase' },
        { id: 'upsc', name: 'UPSC', icon: 'ph-scales' },
        { id: 'ssc', name: 'SSC', icon: 'ph-buildings' },
        { id: 'banking', name: 'Banking', icon: 'ph-bank' }
    ],

    recentTests: [
        { id: 't1', title: 'JEE Main Full Mock 01', exam: 'JEE Main', date: 'Oct 24, 2026', score: '210/300', accuracy: '85%' },
        { id: 't2', title: 'NEET Bio Unit 2', exam: 'NEET', date: 'Oct 20, 2026', score: '320/360', accuracy: '92%' }
    ],

    upcomingTests: [
        { id: 'ut1', title: 'AITS JEE Advanced 04', exam: 'JEE Advanced', difficulty: 'hard', questions: 54, time: '180 mins' },
        { id: 'ut2', title: 'NEET Grand Test 02', exam: 'NEET', difficulty: 'medium', questions: 200, time: '200 mins' },
        { id: 'ut3', title: 'CUET General Test Mock', exam: 'CUET', difficulty: 'easy', questions: 60, time: '60 mins' }
    ],

    practiceQuestion: {
        id: 'q1042',
        exam: 'JEE Main',
        subject: 'Physics',
        chapter: 'Rotational Motion',
        difficulty: 'Hard',
        text: 'A solid cylinder of mass 2 kg and radius 4 cm is rotating about its axis at the rate of 3 rpm. The torque required to stop it after 2 π revolutions is:',
        options: [
            { id: 'a', text: '2 × 10^-6 N m' },
            { id: 'b', text: '2 × 10^-3 N m' },
            { id: 'c', text: '12 × 10^-4 N m' },
            { id: 'd', text: '2 × 10^-4 N m' }
        ],
        correct: 'a'
    }
};

// Simulated API calls
const fetchExams = async () => {
    // Connect API here: fetch('/api/exams')
    return new Promise(resolve => setTimeout(() => resolve(MockDB.exams), 300));
};

const fetchDashboardStats = async () => {
    // Connect API here: fetch('/api/user/stats')
    return new Promise(resolve => setTimeout(() => resolve({
        questionsSolved: 4520,
        accuracy: 84.5,
        testsAttempted: 42,
        streak: 15,
        rankEstimate: 'Top 2%',
        timeSpent: '124 hrs'
    }), 400));
};

const saveProgess = async (data) => {
    // Save result to backend here: post('/api/user/progress', data)
    console.log("Saving progress...", data);
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 200));
};
