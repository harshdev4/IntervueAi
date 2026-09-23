export const getCurrentTopic = (topics, questionNumber) => {
    let count = 0;

    for (const topic of topics) {
        count += topic.question_count;

        if (questionNumber < count) {
            return topic.topic;
        }
    }

    return null;
};