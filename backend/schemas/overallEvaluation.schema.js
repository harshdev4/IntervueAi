import { z } from "zod";

export const OverallEvaluationSchema = z.object({
    overall_score: z.number().min(0).max(10),

    technical_knowledge: z.number().min(0).max(10),

    problem_solving: z.number().min(0).max(10),

    communication: z.number().min(0).max(10),

    strengths: z.array(z.string()),

    areas_for_improvement: z.array(z.string()),

    summary: z.string(),

    recommendation: z.string()
});