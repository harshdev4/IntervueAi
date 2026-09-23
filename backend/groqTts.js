import Groq from "groq-sdk";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();




const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

export async function generateSpeech(voice = "troy") {
    const text = `[professional] Following up on your efficient implementation of the recent conversations list, let's consider a different challenge. In a chat application, you often need to implement a \"Search\" feature to find specific messages within a conversation. If you were to implement a basic autocomplete or \"search-as-you-type\" functionality for these messages on the client side, which data structure would you use to store the messages to ensure that prefix-based searches (e.g., typing \"hel\" to find \"hello\") are highly efficient, and how does this structure differ from a standard Array or Hash Map in terms of time complexity for this specific use case?`
    console.log(text.length);
    
    if (!text || !text.trim()) {
        throw new Error("Text is required");
    }

    const input = text.trim();

    if (input.length > 700) {
        throw new Error(
            "Orpheus input must be 200 characters or fewer"
        );
    }

    const response = await groq.audio.speech.create({
        model: "canopylabs/orpheus-v1-english",
        voice,
        input,
        response_format: "wav"
    });

    const buffer = Buffer.from(await response.arrayBuffer());

    await fs.promises.writeFile(
        "interviewer-test.wav",
        buffer
    );

    console.log(
        "Audio generated successfully: interviewer-test.wav"
    );
}

generateSpeech();