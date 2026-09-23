export const getNextDifficulty = (score, currentDifficulty) => {

    if (score >= 8) {
        if (currentDifficulty === "easy") return "medium";
        if (currentDifficulty === "medium") return "hard";
    }

    if (score <= 4) {
        if (currentDifficulty === "hard") return "medium";
        if (currentDifficulty === "medium") return "easy";
    }

    return currentDifficulty;
};