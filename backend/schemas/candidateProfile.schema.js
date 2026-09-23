import {z} from "zod";

export const CandidateProfileSchema = z.object({
    name: z.string(),

    education: z.array(
        z.object({
            degree: z.string(),
            institution: z.string(),
            duration: z.string(),
            cgpa: z.string().optional(),
            percentage: z.string().optional()
        })
    ),

    technical_skills: z.object({
        languages: z.array(z.string()),
        frontend: z.array(z.string()),
        backend: z.array(z.string()),
        database_and_tools: z.array(z.string()),
        other: z.array(z.string())
    }),

    projects: z.array(
        z.object({
            name: z.string(),
            technologies: z.array(z.string()),
            year: z.string(),
            description: z.string()
        })
    ),

    work_experience: z.array(z.any()),

    certifications: z.array(
        z.object({
            name: z.string(),
            issuer: z.string()
        })
    )
}).passthrough();