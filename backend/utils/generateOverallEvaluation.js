import { askOllama } from "./ollama.js";
import { parseLLMJson } from "./parseJson.js";
import { OverallEvaluationSchema } from "../schemas/overallEvaluation.schema.js";

export const generateOverallEvaluation = async (interview) => {

    const systemPrompt = `
You are an expert technical interviewer.

Analyze the candidate's complete interview performance.

Provide an objective overall evaluation based on:
- technical knowledge
- problem-solving ability
- communication
- correctness of answers
- consistency across the interview
- strengths
- areas requiring improvement

Return ONLY valid JSON.
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


COMPLETE INTERVIEW HISTORY:

${JSON.stringify(
        interview.answers,
        null,
        2
    )}


Return exactly:

{
    "overall_score": number,
    "technical_knowledge": number,
    "problem_solving": number,
    "communication": number,
    "strengths": ["string"],
    "areas_for_improvement": ["string"],
    "summary": "string",
    "recommendation": "string"
}

Rules:
- Scores must be between 0 and 10.
- Base the evaluation only on the interview evidence.
- Do not invent achievements or knowledge that were not demonstrated.
- Return only JSON.
`;

    const response = await askOllama(
        systemPrompt,
        userPrompt
    );

    const parsed = parseLLMJson(response);

    return OverallEvaluationSchema.parse(parsed);
};