import crypto from "crypto";

const interviews = new Map();

export const createInterview = (interview) => {
    const id = crypto.randomUUID();
    const totalQuestions = interview.interviewPlan.topics.reduce((total, topic) => total + topic.question_count, 0);
    const initialDifficulty = interview.interviewPlan?.difficulty || "medium";
    interviews.set(id, {
        ...interview,
        currentQuestion: null,
        questionBuffer: [],
        questions: [],
        answers: [],
        currentDifficulty: initialDifficulty,
        totalQuestions,
        overallEvaluation: null,
        isGeneratingNextQuestion: false
    });

    return id;
};

export const getInterview = (id) => {
    return interviews.get(id);
};