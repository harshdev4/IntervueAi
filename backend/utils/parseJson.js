export const parseLLMJson = (content) => {

    const cleanContent = content
        .replace(/```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();

    try {
        return JSON.parse(cleanContent);
    } catch (error) {
        console.error("Invalid JSON returned by LLM:");
        console.error(cleanContent);

        throw new Error("LLM returned invalid JSON");
    }
};