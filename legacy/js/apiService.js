// js/apiService.js
export async function fetchQuizList(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} fetching manifest.`);
    }
    return await response.json();
}

export async function fetchQuizData(filePath) {
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} loading ${filePath}`);
    }
    return await response.json();
}

// Example for supervision info - can be combined with fetchQuizData or separate
export async function fetchQuizSupervisionInfo(filePath) {
    const response = await fetch(filePath); // Or get it from already fetched data
    if (!response.ok) {
        throw new Error(`HTTP error fetching supervision info! status: ${response.status}`);
    }
    const quizData = await response.json();
    
    // Handle both legacy (array) and new (object) formats
    const questionsArray = Array.isArray(quizData) ? quizData : quizData.questions || [];

    let total = questionsArray.length;
    let supervised = 0, generated = 0, unsupervised = 0;
    questionsArray.forEach(q => {
        if (typeof q.supervised === 'string') {
            const s = q.supervised.trim().toLowerCase();
            if (s === 'yes') supervised++;
            else if (s === 'generated') generated++;
            else unsupervised++;
        } else {
            unsupervised++;
        }
    });
    return { total, supervised, generated, unsupervised };
}