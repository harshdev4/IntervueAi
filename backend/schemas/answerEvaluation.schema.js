import { z } from "zod";

export const AnswerEvaluationSchema = z.object({
    score: z.number().min(0).max(10),

    correctness: z.enum([
        "correct",
        "mostly_correct",
        "partially_correct",
        "incorrect"
    ]),

    strengths: z.array(z.string()),

    weaknesses: z.array(z.string()),

    feedback: z.string(),

    concepts_covered: z.array(z.string()),

    concepts_missing: z.array(z.string()),

    recommended_difficulty: z.enum([
        "easy",
        "medium",
        "hard"
    ])
});