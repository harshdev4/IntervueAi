import axios from "axios";

export const askOllama = async (systemPrompt, userPrompt) => {

    const response = await axios.post(
        "https://ollama.com/api/chat",
        {
            model: "gemma4:31b-cloud",

            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],

            stream: false
        },
        {
            headers: {
                Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );

    return response.data.message.content;
};