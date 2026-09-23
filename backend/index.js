import express from "express";
import { upload } from "./config/multer.config.js";
import { PDFParse } from "pdf-parse";
import dotenv from "dotenv";

import { askOllama } from "./utils/ollama.js";
import { parseLLMJson } from "./utils/parseJson.js";

import { CandidateProfileSchema } from "./schemas/candidateProfile.schema.js";

import {
    createInterview,
    getInterview
} from "./store/interviewStore.js";

import { getCurrentTopic } from "./utils/interviewCurrentTopic.js";
import { getNextDifficulty } from "./utils/computeDifficulty.js";

import { AnswerEvaluationSchema } from "./schemas/answerEvaluation.schema.js";
import { generateOverallEvaluation } from "./utils/generateOverallEvaluation.js";

import cors from "cors";
import Groq from "groq-sdk";


dotenv.config();


// ============================================================
// GROQ
// ============================================================

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});


const app = express();

app.use(cors());

app.use(express.json());


// ============================================================
// TTS HELPER
// ============================================================

async function generateQuestionAudio(text) {

    if (!text || !text.trim()) {
        throw new Error("TTS text is empty");
    }


    const trimmedText = text.trim();


    if (trimmedText.length > 700) {
        throw new Error(
            `TTS text exceeds 700 characters (${trimmedText.length})`
        );
    }


    const response = await groq.audio.speech.create({
        model: "canopylabs/orpheus-v1-english",

        voice:
            process.env.GROQ_TTS_VOICE ||
            "troy",

        input: trimmedText,

        response_format: "wav"
    });


    const audioBuffer = Buffer.from(
        await response.arrayBuffer()
    );


    return {
        audio: audioBuffer.toString("base64"),
        audioMimeType: "audio/wav"
    };
}


// ============================================================
// START INTERVIEW
// ============================================================

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

            const {
                jobDescription
            } = req.body;


            if (
                !jobDescription ||
                !jobDescription.trim()
            ) {

                return res.status(400).json({
                    message: "Job description is required"
                });

            }


            // --------------------------------
            // 3. Extract resume text
            // --------------------------------

            const parser = new PDFParse({
                data: req.file.buffer
            });


            const resume =
                await parser.getText();


            const resumeText =
                resume.text.trim();


            if (!resumeText) {

                return res.status(400).json({
                    message:
                        "Could not extract text from resume"
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


            const profileResponse =
                await askOllama(
                    profilePrompt,
                    resumeText
                );


            // --------------------------------
            // 5. Parse profile
            // --------------------------------

            const profile =
                parseLLMJson(
                    profileResponse
                );


            // --------------------------------
            // 6. Validate profile
            // --------------------------------

            const validatedProfile =
                CandidateProfileSchema.parse(
                    profile
                );


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

IMPORTANT:
- The interview must contain EXACTLY 10 questions in total.
- Do not create more than 10 questions.
- Do not create fewer than 10 questions.
- Distribute the 10 questions across the most relevant topics.
- Questions should progressively adapt from easy to medium to hard where appropriate.
- Include practical and conceptual questions.
- Avoid duplicate questions.

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

${JSON.stringify(
    validatedProfile,
    null,
    2
)}


JOB DESCRIPTION:

${jobDescription}
`;


            const planResponse =
                await askOllama(
                    plannerSystemPrompt,
                    plannerUserPrompt
                );


            // --------------------------------
            // 8. Parse interview plan
            // --------------------------------

            const interviewPlan =
                parseLLMJson(
                    planResponse
                );


            // --------------------------------
            // 9. Create interview
            // --------------------------------

            const interviewId =
                createInterview({

                    candidateProfile:
                        validatedProfile,

                    jobDescription,

                    interviewPlan

                });


            // --------------------------------
            // 10. Response
            // --------------------------------

            return res.status(200).json({

                message:
                    "Interview initialized successfully",

                interviewId,

                candidate:
                    validatedProfile,

                interviewPlan

            });


        } catch (error) {

            console.error(
                "Start interview error:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                message:
                    "Something went wrong while starting the interview"

            });

        }
    }
);


// ============================================================
// GENERATE ONE QUESTION
// ============================================================

async function generateQuestion(
    interview,
    questionNumber,
    difficulty
) {

    const currentTopic =
        getCurrentTopic(
            interview.interviewPlan.topics,
            questionNumber - 1
        );


    if (
        !currentTopic ||
        questionNumber >
            interview.totalQuestions
    ) {

        return null;

    }


    const systemPrompt = `
You are an expert technical interviewer.

Generate exactly ONE concise interview question.

Rules:

- Base the question on the candidate profile and project experience where appropriate.
- Follow the interview plan and the assigned topic.
- Match difficulty level: ${difficulty}.
- Must be practical rather than trivia.
- Avoid repeating questions asked previously.
- Keep the question concise and strictly under 500 characters so it can be spoken naturally by TTS.
- Do NOT use markdown.
- Do NOT include any preamble, greetings, or explanations before or after the question.
- Return ONLY the question text itself.
`;


    const userPrompt = `
CANDIDATE PROFILE:

${JSON.stringify(
    interview.candidateProfile,
    null,
    2
)}


JOB DESCRIPTION:

${interview.jobDescription}


INTERVIEW PLAN:

${JSON.stringify(
    interview.interviewPlan,
    null,
    2
)}


PREVIOUS QUESTIONS AND ANSWERS:

${JSON.stringify(
    interview.answers.map(a => ({
        question: a.question,
        answer: a.answer
    })),
    null,
    2
)}


CURRENT TOPIC:

${currentTopic}


CURRENT DIFFICULTY:

${difficulty}
`;


    const rawQuestion =
        await askOllama(
            systemPrompt,
            userPrompt
        );


    let questionText =
        rawQuestion
            ? rawQuestion
                .replace(/\\/g, "")
                .replace(/[`*#_]/g, "")
                .trim()
            : "";


    if (
        questionText.startsWith('"') &&
        questionText.endsWith('"')
    ) {

        questionText =
            questionText
                .slice(1, -1)
                .trim();

    }


    return {

        questionNumber,

        topic:
            currentTopic,

        difficulty,

        question:
            questionText

    };
}


// ============================================================
// GENERATE QUESTION + TTS
// ============================================================

async function generateQuestionWithAudio(
    interview,
    questionNumber,
    difficulty
) {

    const question =
        await generateQuestion(
            interview,
            questionNumber,
            difficulty
        );


    if (!question) {
        return null;
    }


    if (!question.question) {
        throw new Error(
            "Question generation returned empty question"
        );
    }


    // Generate TTS immediately
    const audio =
        await generateQuestionAudio(
            question.question
        );


    return {
        ...question,

        audio:
            audio.audio,

        audioMimeType:
            audio.audioMimeType
    };
}


// ============================================================
// BACKGROUND QUESTION + TTS BUFFER
// ============================================================

async function triggerBackgroundQuestionGeneration(
    interview
) {

    // Prevent duplicate generation
    if (
        interview.isGeneratingNextQuestion
    ) {
        return;
    }


    // We only need one question ahead
    if (
        interview.questionBuffer.length >= 1
    ) {
        return;
    }


    const currentQNum =
        interview.currentQuestion
            ? interview.currentQuestion.questionNumber
            : 0;


    const nextQNum =
        currentQNum +
        1 +
        interview.questionBuffer.length;


    if (
        nextQNum >
        interview.totalQuestions
    ) {
        return;
    }


    interview.isGeneratingNextQuestion =
        true;


    try {

        console.log(
            `[Interview] Generating Q${nextQNum} in background...`
        );


        const questionObj =
            await generateQuestionWithAudio(
                interview,
                nextQNum,
                interview.currentDifficulty
            );


        if (
            questionObj &&
            questionObj.question
        ) {

            const expectedNext =
                (
                    interview.currentQuestion
                        ?.questionNumber || 0
                ) + 1;


            if (
                questionObj.questionNumber ===
                    expectedNext &&

                interview.questionBuffer
                    .length === 0
            ) {

                interview.questionBuffer.push(
                    questionObj
                );


                console.log(
                    `[Interview] Q${questionObj.questionNumber} + TTS buffered`
                );

            }

        }

    } catch (err) {

        console.error(
            "Background question/TTS generation error:",
            err.message
        );

    } finally {

        interview.isGeneratingNextQuestion =
            false;

    }
}


// ============================================================
// GET FIRST QUESTION
// ============================================================

app.post(
    "/interview/:id/question",

    async (req, res) => {

        try {

            const interview =
                getInterview(
                    req.params.id
                );


            if (!interview) {

                return res.status(404).json({
                    message:
                        "Interview not found"
                });

            }


            // ------------------------------------------
            // If question already exists
            // ------------------------------------------

            if (
                interview.currentQuestion
            ) {

                return res.status(200).json({

                    question:
                        interview.currentQuestion.question,

                    questionNumber:
                        interview.currentQuestion
                            .questionNumber,

                    totalQuestions:
                        interview.totalQuestions,

                    topic:
                        interview.currentQuestion.topic,

                    difficulty:
                        interview.currentQuestion.difficulty,

                    audio:
                        interview.currentQuestion.audio,

                    audioMimeType:
                        interview.currentQuestion
                            .audioMimeType

                });

            }


            // ------------------------------------------
            // Generate Q1 + TTS
            // ------------------------------------------

            const q1 =
                await generateQuestionWithAudio(
                    interview,
                    1,
                    interview.currentDifficulty
                );


            if (!q1) {

                return res.status(400).json({
                    message:
                        "Interview completed"
                });

            }


            // ------------------------------------------
            // Store Q1
            // ------------------------------------------

            interview.currentQuestion =
                q1;


            interview.questions.push(
                q1
            );


            // ------------------------------------------
            // Generate Q2 + TTS in background
            // ------------------------------------------

            if (
                interview.totalQuestions >= 2
            ) {

                triggerBackgroundQuestionGeneration(
                    interview
                );

            }


            // ------------------------------------------
            // Return Q1 + audio
            // ------------------------------------------

            return res.status(200).json({

                question:
                    q1.question,

                questionNumber:
                    q1.questionNumber,

                totalQuestions:
                    interview.totalQuestions,

                topic:
                    q1.topic,

                difficulty:
                    q1.difficulty,

                audio:
                    q1.audio,

                audioMimeType:
                    q1.audioMimeType

            });


        } catch (error) {

            console.error(
                "Question generation error:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                message:
                    "Failed to generate question"

            });

        }
    }
);


// ============================================================
// ANSWER
// ============================================================

app.post(
    "/interview/:id/answer",

    async (req, res) => {

        try {

            const interview =
                getInterview(
                    req.params.id
                );


            if (!interview) {

                return res.status(404).json({
                    message:
                        "Interview not found"
                });

            }


            const {
                answer
            } = req.body;


            if (
                !answer ||
                !answer.trim()
            ) {

                return res.status(400).json({
                    message:
                        "Answer is required"
                });

            }


            // ------------------------------------------
            // Current question
            // ------------------------------------------

            const currentQ =
                interview.currentQuestion || {

                    questionNumber: 1,

                    question:
                        "Interview question",

                    topic:
                        "General",

                    difficulty:
                        interview.currentDifficulty

                };


            // ------------------------------------------
            // Evaluate answer
            // ------------------------------------------

const answerEvaluationPrompt = `
You are an expert technical interview evaluator.

Evaluate the candidate's answer to the interview question.

IMPORTANT:
The candidate's answer was spoken verbally and then converted to text using
Speech-to-Text (STT). Therefore, the transcript may contain transcription
errors that are not the candidate's actual mistakes.

Candidate profile:

${JSON.stringify(
    interview.candidateProfile
)}

Interview question:

${currentQ.question}

Candidate answer (STT transcript):

${answer}

Evaluate the answer based on:

- correctness
- relevance
- completeness
- technical depth
- clarity
- understanding of the underlying concept

STT TRANSCRIPTION RULES:

1. Do NOT penalize the candidate for obvious STT-related mistakes when the
   intended meaning is reasonably clear.

2. Ignore minor:
   - spelling mistakes
   - punctuation mistakes
   - capitalization mistakes
   - grammar mistakes caused by speech
   - phonetic transcription mistakes
   - words that sound similar but are clearly identifiable from context

3. Technical terms may be transcribed incorrectly by STT. Infer the intended
   technical term when the surrounding context makes it reasonably clear.

   Examples:
   - "use memo" -> "useMemo"
   - "use callback" -> "useCallback"
   - "sequel" -> "SQL"
   - "node j s" -> "Node.js"
   - "express j s" -> "Express.js"
   - "mongo d b" -> "MongoDB"
   - "rest API" -> "REST API"

4. Evaluate what the candidate most reasonably intended to communicate,
   rather than judging the quality of the transcription itself.

5. Do NOT assume every unusual word is an STT error. If the candidate
   actually demonstrates an incorrect technical concept, penalize it.

   Example:
   "useMemo is used to make API requests."

   This is a technical misunderstanding and should be penalized even though
   the transcription itself may be correct.

6. Do not give credit for concepts that the candidate did not actually
   communicate. Do not invent missing explanations or assume knowledge that
   is not present in the answer.

7. Do not penalize the candidate for imperfect spoken-language grammar unless
   it makes the technical meaning unclear.

8. Evaluate the answer according to the exact question being asked and the
   expected knowledge level for that question.

9. Distinguish between:
   - STT/transcription error
   - minor wording issue
   - actual technical misunderstanding

10. If an STT error makes the answer ambiguous and there are multiple
    plausible interpretations, do not assume the most favorable interpretation.
    Evaluate only what can reasonably be understood from the context.

SCORING:

- 9-10: Excellent understanding, technically correct and sufficiently complete
- 7-8: Good understanding with minor omissions or inaccuracies
- 5-6: Partial understanding with noticeable gaps
- 3-4: Significant misunderstanding or major missing concepts
- 0-2: Mostly incorrect, irrelevant, or demonstrates very little understanding

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
- Do not penalize obvious STT errors when the intended technical meaning is clear.
- Do penalize genuine technical misunderstandings.
- Return ONLY valid JSON with no markdown, explanation, or code fences.
`;

            const evaluatorText =
                await askOllama(
                    "You are an expert technical interview evaluator.",
                    answerEvaluationPrompt
                );


            const evaluation =
                AnswerEvaluationSchema.parse(
                    parseLLMJson(
                        evaluatorText
                    )
                );


            // ------------------------------------------
            // Store answer
            // ------------------------------------------

            interview.answers.push({

                question:
                    currentQ.question,

                questionNumber:
                    currentQ.questionNumber,

                topic:
                    currentQ.topic,

                difficulty:
                    currentQ.difficulty,

                answer:
                    answer.trim(),

                evaluation

            });


            // ------------------------------------------
            // Adaptive difficulty
            // ------------------------------------------

            const newDifficulty =
                getNextDifficulty(
                    evaluation.score,
                    interview.currentDifficulty
                );


            interview.currentDifficulty =
                newDifficulty;


            // ------------------------------------------
            // Final question
            // ------------------------------------------

            if (
                currentQ.questionNumber >=
                interview.totalQuestions
            ) {

                const overallEvaluation =
                    await generateOverallEvaluation(
                        interview
                    );


                interview.overallEvaluation =
                    overallEvaluation;


                return res.status(200).json({

                    message:
                        "Interview completed",

                    completed:
                        true,

                    evaluation,

                    totalQuestions:
                        interview.totalQuestions,

                    overallEvaluation

                });

            }


            // ------------------------------------------
            // Get next question
            // ------------------------------------------

            let nextQuestion = null;


            // First try buffered question
            if (
                interview.questionBuffer
                    .length > 0
            ) {

                nextQuestion =
                    interview.questionBuffer.shift();


                console.log(
                    `[Interview] Using buffered Q${nextQuestion.questionNumber} + TTS`
                );

            } else {

                // Fallback if background
                // generation wasn't finished
                console.log(
                    "[Interview] Buffer empty, generating next question + TTS..."
                );


                const targetQNum =
                    currentQ.questionNumber + 1;


                nextQuestion =
                    await generateQuestionWithAudio(
                        interview,
                        targetQNum,
                        interview.currentDifficulty
                    );

            }


            // ------------------------------------------
            // If no question
            // ------------------------------------------

            if (!nextQuestion) {

                const overallEvaluation =
                    await generateOverallEvaluation(
                        interview
                    );


                interview.overallEvaluation =
                    overallEvaluation;


                return res.status(200).json({

                    message:
                        "Interview completed",

                    completed:
                        true,

                    evaluation,

                    totalQuestions:
                        interview.totalQuestions,

                    overallEvaluation

                });

            }


            // ------------------------------------------
            // Set current question
            // ------------------------------------------

            interview.currentQuestion =
                nextQuestion;


            interview.questions.push(
                nextQuestion
            );


            // ------------------------------------------
            // Start generating question after next
            // ------------------------------------------

            triggerBackgroundQuestionGeneration(
                interview
            );


            // ------------------------------------------
            // Return evaluation + next question + TTS
            // ------------------------------------------

            return res.status(200).json({

                message:
                    "Answer evaluated",

                completed:
                    false,

                evaluation,

                newDifficulty,

                question:
                    nextQuestion.question,

                questionNumber:
                    nextQuestion.questionNumber,

                totalQuestions:
                    interview.totalQuestions,

                topic:
                    nextQuestion.topic,

                difficulty:
                    nextQuestion.difficulty,

                audio:
                    nextQuestion.audio,

                audioMimeType:
                    nextQuestion.audioMimeType

            });


        } catch (error) {

            console.error(
                "Answer evaluation error:",
                error.response?.data ||
                error.message
            );


            return res.status(500).json({

                message:
                    "Failed to process answer"

            });

        }
    }
);


// ============================================================
// SERVER
// ============================================================

app.listen(
    5000,
    () => {

        console.log(
            "Server started at http://localhost:5000"
        );

    }
);