import express from "express";
import { upload } from "./config/multer.config.js";
import { PDFParse } from "pdf-parse";
import dotenv from "dotenv";

import { askOllama } from "./utils/ollama.js";
import { parseLLMJson } from "./utils/parseJson.js";
import { CandidateProfileSchema } from "./schemas/candidateProfile.schema.js";
import { createInterview } from "./store/interviewStore.js";
import { getInterview } from "./store/interviewStore.js";
import { getCurrentTopic } from "./utils/interviewCurrentTopic.js";
import { getNextDifficulty } from "./utils/computeDifficulty.js";
import { AnswerEvaluationSchema } from "./schemas/answerEvaluation.schema.js";
import { generateOverallEvaluation } from "./utils/generateOverallEvaluation.js";
import cors from "cors";
import Groq from "groq-sdk";

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const app = express();

app.use(cors())

app.use(express.json());


app.post(
    "/start-interview",
    upload.single("file"),

    async (req, res) => {

        try {

            // --------------------------------
            // 1. Validate uploaded file
            // --------------------------------

            if (!req.file) {
                return res.status(400).json({
                    message: "Resume PDF is required"
                });
            }


            // --------------------------------
            // 2. Validate job description
            // --------------------------------

            const { jobDescription } = req.body;

            if (!jobDescription || !jobDescription.trim()) {
                return res.status(400).json({
                    message: "Job description is required"
                });
            }


            // --------------------------------
            // 3. Extract text from PDF
            // --------------------------------

            const parser = new PDFParse({
                data: req.file.buffer
            });

            const resume = await parser.getText();

            const resumeText = resume.text.trim();


            if (!resumeText) {
                return res.status(400).json({
                    message: "Could not extract text from resume"
                });
            }


            // --------------------------------
            // 4. Candidate profiling
            // --------------------------------

            const profilePrompt = `
You are a candidate profiling agent.

Analyze the candidate's resume.

Extract the following information:

- name
- education
- technical skills
- projects
- work experience
- certifications

Return ONLY valid JSON.

Do not use Markdown.
Do not wrap the JSON in code fences.
Do not add explanations.

Use exactly this structure:

{
    "name": "string",

    "education": [
        {
            "degree": "string",
            "institution": "string",
            "duration": "string",
            "cgpa": "string",
            "percentage": "string"
        }
    ],

    "technical_skills": {
        "languages": [],
        "frontend": [],
        "backend": [],
        "database_and_tools": [],
        "other": []
    },

    "projects": [
        {
            "name": "string",
            "technologies": [],
            "year": "string",
            "description": "string"
        }
    ],

    "work_experience": [],

    "certifications": [
        {
            "name": "string",
            "issuer": "string"
        }
    ]
}
`;


            const profileResponse = await askOllama(
                profilePrompt,
                resumeText
            );


            // --------------------------------
            // 5. Clean + parse LLM response
            // --------------------------------

            const profile = parseLLMJson(profileResponse);


            // --------------------------------
            // 6. Validate profile
            // --------------------------------

            const validatedProfile =
                CandidateProfileSchema.parse(profile);


            // --------------------------------
            // 7. Generate interview plan
            // --------------------------------

            const plannerSystemPrompt = `
You are an expert technical interview planner.

Create an interview plan based on:

1. Candidate profile
2. Job description

The interview should evaluate the candidate's actual skills against the requirements of the job.

Consider:

- technical skills
- candidate projects
- candidate experience
- job requirements
- difficulty
- behavioral questions
- project-based questions

Return ONLY valid JSON.

Do not use Markdown.
Do not wrap the JSON in code fences.
Do not add explanations.

Use this structure:

{
    "difficulty": "easy | medium | hard",

    "topics": [
        {
            "topic": "string",
            "reason": "string",
            "question_count": 0
        }
    ],

    "question_types": [
        "technical",
        "project",
        "behavioral"
    ]
}
`;


            const plannerUserPrompt = `
CANDIDATE PROFILE:

${JSON.stringify(validatedProfile, null, 2)}


JOB DESCRIPTION:

${jobDescription}
`;


            const planResponse = await askOllama(
                plannerSystemPrompt,
                plannerUserPrompt
            );


            // --------------------------------
            // 8. Parse interview plan
            // --------------------------------

            const interviewPlan =
                parseLLMJson(planResponse);



            const interviewId = createInterview({
                candidateProfile: validatedProfile,
                jobDescription,
                interviewPlan
            });

            // --------------------------------
            // 9. Send response
            // --------------------------------

            return res.status(200).json({

                message: "Interview initialized successfully",
                interviewId,
                candidate: validatedProfile,
                interviewPlan

            });

        } catch (error) {

            console.error(
                "Error:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({
                message: "Something went wrong while starting the interview"
            });
        }
    }
);


// Helper to generate a single concise question using Ollama
async function generateQuestion(interview, questionNumber, difficulty) {
    const currentTopic = getCurrentTopic(
        interview.interviewPlan.topics,
        questionNumber - 1
    );

    if (!currentTopic || questionNumber > interview.totalQuestions) {
        return null;
    }

    const systemPrompt = `You are an expert technical interviewer.
Generate exactly ONE concise interview question.

Rules:
- Base the question on the candidate profile and project experience where appropriate.
- Follow the interview plan and the assigned topic.
- Match difficulty level: ${difficulty}.
- Must be practical rather than trivia.
- Avoid repeating questions asked previously.
- Keep the question concise and strictly under 200 characters so it can be spoken naturally by TTS.
- Do NOT use markdown.
- Do NOT include any preamble, greetings, or explanations before or after the question.
- Return ONLY the question text itself.`;

    const userPrompt = `
CANDIDATE PROFILE:
${JSON.stringify(interview.candidateProfile, null, 2)}

JOB DESCRIPTION:
${interview.jobDescription}

INTERVIEW PLAN:
${JSON.stringify(interview.interviewPlan, null, 2)}

PREVIOUS QUESTIONS AND ANSWERS:
${JSON.stringify(
    interview.answers.map(a => ({ question: a.question, answer: a.answer })),
    null,
    2
)}

CURRENT TOPIC:
${currentTopic}

CURRENT DIFFICULTY:
${difficulty}
`;

    const rawQuestion = await askOllama(systemPrompt, userPrompt);
    let questionText = rawQuestion ? rawQuestion.replace(/\\/g, "").replace(/[`*#_]/g, "").trim() : "";

    if (questionText.startsWith('"') && questionText.endsWith('"')) {
        questionText = questionText.slice(1, -1).trim();
    }

    return {
        questionNumber,
        topic: currentTopic,
        difficulty,
        question: questionText
    };
}

// Background question generation with concurrency protection
async function triggerBackgroundQuestionGeneration(interview) {
    if (interview.isGeneratingNextQuestion) {
        return;
    }

    if (interview.questionBuffer.length >= 1) {
        return;
    }

    const currentQNum = interview.currentQuestion ? interview.currentQuestion.questionNumber : 0;
    const nextQNum = currentQNum + 1 + interview.questionBuffer.length;

    if (nextQNum > interview.totalQuestions) {
        return;
    }

    interview.isGeneratingNextQuestion = true;
    try {
        const questionObj = await generateQuestion(
            interview,
            nextQNum,
            interview.currentDifficulty
        );

        if (questionObj && questionObj.question) {
            const expectedNext = (interview.currentQuestion?.questionNumber || 0) + 1;
            if (questionObj.questionNumber === expectedNext && interview.questionBuffer.length === 0) {
                interview.questionBuffer.push(questionObj);
                console.log(`[Interview] Background buffered Q${questionObj.questionNumber} (${questionObj.difficulty})`);
            }
        }
    } catch (err) {
        console.error("Background question generation error:", err.message);
    } finally {
        interview.isGeneratingNextQuestion = false;
    }
}

app.post("/interview/:id/question", async (req, res) => {
    try {
        const interview = getInterview(req.params.id);

        if (!interview) {
            return res.status(404).json({
                message: "Interview not found"
            });
        }

        // If current question already exists, return it without regenerating
        if (interview.currentQuestion) {
            return res.status(200).json({
                question: interview.currentQuestion.question,
                questionNumber: interview.currentQuestion.questionNumber,
                totalQuestions: interview.totalQuestions,
                topic: interview.currentQuestion.topic,
                difficulty: interview.currentQuestion.difficulty
            });
        }

        // First call: generate Q1 and Q2
        const q1 = await generateQuestion(interview, 1, interview.currentDifficulty);
        if (!q1) {
            return res.status(400).json({ message: "Interview completed" });
        }

        interview.currentQuestion = q1;
        interview.questions.push(q1);

        // Pre-generate Q2 if there are more questions
        if (interview.totalQuestions >= 2) {
            try {
                const q2 = await generateQuestion(interview, 2, interview.currentDifficulty);
                if (q2) {
                    interview.questionBuffer.push(q2);
                    console.log(`[Interview] Initial buffered Q2 (${q2.difficulty})`);
                }
            } catch (err) {
                console.error("Failed initial Q2 buffer generation:", err.message);
            }
        }

        return res.status(200).json({
            question: q1.question,
            questionNumber: q1.questionNumber,
            totalQuestions: interview.totalQuestions,
            topic: q1.topic,
            difficulty: q1.difficulty
        });

    } catch (error) {
        console.error(
            "Question generation error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            message: "Failed to generate question"
        });
    }
});

app.post("/interview/:id/answer", async (req, res) => {
    try {
        const interview = getInterview(req.params.id);

        if (!interview) {
            return res.status(404).json({
                message: "Interview not found"
            });
        }

        const { answer } = req.body;

        if (!answer || !answer.trim()) {
            return res.status(400).json({
                message: "Answer is required"
            });
        }

        const currentQ = interview.currentQuestion || {
            questionNumber: 1,
            question: "Interview question",
            topic: "General",
            difficulty: interview.currentDifficulty
        };

        const answerEvaluationPrompt = `
You are an expert technical interview evaluator.

Evaluate the candidate's answer to the interview question.

Candidate profile:
${JSON.stringify(interview.candidateProfile)}

Interview question:
${currentQ.question}

Candidate answer:
${answer}

Evaluate the answer based on:
- correctness
- relevance
- completeness
- technical depth
- clarity

Return ONLY valid JSON.

Output format:
{
  "score": number,
  "correctness": "correct" | "mostly_correct" | "partially_correct" | "incorrect",
  "strengths": ["string"],
  "weaknesses": ["string"],
  "feedback": "string",
  "concepts_covered": ["string"],
  "concepts_missing": ["string"],
  "recommended_difficulty": "easy" | "medium" | "hard"
}

Rules:
- score must be between 0 and 10
- Do not judge grammar unless it affects technical clarity.
- Do not invent technologies or concepts that the candidate did not mention.
- Evaluate according to the question being asked.
`;

        const evaluatorText = await askOllama("You are an expert technical interview evaluator.", answerEvaluationPrompt);
        const evaluation = AnswerEvaluationSchema.parse(
            parseLLMJson(evaluatorText)
        );

        interview.answers.push({
            question: currentQ.question,
            questionNumber: currentQ.questionNumber,
            topic: currentQ.topic,
            difficulty: currentQ.difficulty,
            answer: answer.trim(),
            evaluation
        });

        // Update adaptive difficulty
        const newDifficulty = getNextDifficulty(evaluation.score, interview.currentDifficulty);
        interview.currentDifficulty = newDifficulty;

        // Check if final question
        if (currentQ.questionNumber >= interview.totalQuestions) {
            const overallEvaluation = await generateOverallEvaluation(interview);
            interview.overallEvaluation = overallEvaluation;
            return res.status(200).json({
                message: "Interview completed",
                completed: true,
                evaluation,
                totalQuestions: interview.totalQuestions,
                overallEvaluation
            });
        }

        // Non-final question transition: pull from buffer or fallback
        let nextQuestion = null;
        if (interview.questionBuffer.length > 0) {
            nextQuestion = interview.questionBuffer.shift();
        } else {
            // Fallback generation if buffer was empty
            const targetQNum = currentQ.questionNumber + 1;
            nextQuestion = await generateQuestion(interview, targetQNum, interview.currentDifficulty);
        }

        if (!nextQuestion) {
            // If no more topics or question generated, complete interview
            const overallEvaluation = await generateOverallEvaluation(interview);
            interview.overallEvaluation = overallEvaluation;
            return res.status(200).json({
                message: "Interview completed",
                completed: true,
                evaluation,
                totalQuestions: interview.totalQuestions,
                overallEvaluation
            });
        }

        interview.currentQuestion = nextQuestion;
        interview.questions.push(nextQuestion);

        // Immediately trigger background generation for the following question
        triggerBackgroundQuestionGeneration(interview);

        return res.status(200).json({
            message: "Answer evaluated",
            completed: false,
            evaluation,
            newDifficulty,
            question: nextQuestion.question,
            questionNumber: nextQuestion.questionNumber,
            totalQuestions: interview.totalQuestions,
            topic: nextQuestion.topic,
            difficulty: nextQuestion.difficulty
        });

    } catch (error) {
        console.error("Answer evaluation error:", error);

        res.status(500).json({
            message: "Failed to process answer"
        });
    }
});

// Groq Orpheus TTS endpoint
app.post("/voice/speak", async (req, res) => {
    try {
        const { text, voice } = req.body;

        if (!text || typeof text !== "string" || !text.trim()) {
            return res.status(400).json({
                message: "Text is required"
            });
        }

        const trimmedText = text.trim();
        if (trimmedText.length > 200) {
            return res.status(400).json({
                message: `Text exceeds maximum 200 characters limit (${trimmedText.length} characters provided)`
            });
        }

        const chosenVoice = voice || process.env.GROQ_TTS_VOICE || "troy";

        const response = await groq.audio.speech.create({
            model: "canopylabs/orpheus-v1-english",
            voice: chosenVoice,
            input: trimmedText,
            response_format: "wav"
        });

        const buffer = Buffer.from(await response.arrayBuffer());
        res.set("Content-Type", "audio/wav");
        return res.send(buffer);

    } catch (error) {
        console.error("Groq TTS Error:", error.message);
        return res.status(500).json({
            message: "Failed to generate speech",
            error: error.message
        });
    }
});

app.listen(5000, () => {

    console.log(
        "Server started at http://localhost:5000"
    );

});