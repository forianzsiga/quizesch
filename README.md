# Quizesch

A simple, web-based quiz application designed to load and present quizzes dynamically from JSON data files. This project is currently under active development.

## Purpose

The main goal of Quizesch is to provide a flexible platform for taking quizzes derived from various source materials (like PDF lecture notes or documents). It supports multiple question types and allows for easy addition of new quiz content.

## Features

*   **Dynamic Quiz Loading:** Loads available quizzes listed in an automatically generated manifest file (`data/quiz-manifest.json`).
*   **Multiple Question Types:** Supports:
    *   Multiple Choice (single or multiple correct answers)
    *   Fill-in-the-Blanks
    *   Drag-and-Drop matching
*   **Interactive Evaluation:** Allows users to evaluate their answer to a specific question before moving on, providing immediate feedback.
*   **Navigation:** Previous/Next question buttons.
*   **Shuffling:** Option to shuffle the order of questions within a quiz.
*   **Reset:** Ability to clear the answer for the current question.
*   **Scoring:** Calculates and displays the final score upon submission.
*   **Extensible:** Designed for easy addition of new quiz data via JSON files.
*   **Automatic Manifest Generation:** Includes a build script (`build.bat`) to automatically create the list of available quizzes.

## How it Works

1.  The `build.bat` script scans the `data/` directory for `.json` files and creates `data/quiz-manifest.json`, which lists them.
2.  When the application is run (typically via `runServer.bat`, which calls `build.bat` first), it fetches `data/quiz-manifest.json`.
3.  It displays a list of the quizzes found in the manifest.
4.  When a user selects a quiz, the corresponding JSON file (e.g., `data/quiz_name.json`) is fetched.
5.  The questions from the JSON are loaded into the application state.
6.  Questions are displayed one by one, allowing user interaction based on the `question_type`.
7.  User answers are stored temporarily.
8.  The "Evaluate Question" button provides feedback on the current question without submitting the whole quiz.
9.  The "Submit Quiz" button (appears on the last question) calculates the total score based on all saved answers.
10. The final score is displayed.

## How to Run Locally

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/quizesch.git
    cd quizesch
    ```
2.  **Prerequisites:** Ensure you have Python 3 installed and added to your system's PATH, as the `runServer.bat` script uses `python -m http.server`.
3.  **Run the server:** Execute the `runServer.bat` script.
    ```bash
    runServer.bat
    ```
    *   This script will first automatically run `build.bat` to generate/update the `data/quiz-manifest.json` file.
    *   Then, it will start a simple Python web server.
4.  **Access the application:** Open the URL provided by the server (usually `http://localhost:8000`) in your web browser. You should see the list of available quizzes based on the JSON files found in the `data` directory.

## Build Scripts

*   **`build.bat`**:
    *   Scans the `data/` directory for all files ending with `.json`.
    *   Automatically creates or overwrites the `data/quiz-manifest.json` file.
    *   This manifest file contains a JSON array listing the filenames of all quizzes found.
    *   You generally don't need to run this manually, as `runServer.bat` calls it first.
*   **`runServer.bat`**:
    *   Calls `build.bat` to ensure the quiz manifest is up-to-date.
    *   Starts a local Python HTTP server to serve the `index.html`, CSS, JavaScript, and data files. This is necessary for the `fetch` API to work correctly with local files.

## How to Contribute (Adding New Quizzes)

This project relies on manually curated JSON data files for its quizzes. As noted in the application warning, the current process involves extracting information from source PDFs using multimodal Large Language Models (LLMs) and then refining the output into the required JSON format.

**⚠️ Important:** LLMs are helpful but not perfect. **Always manually review, verify, and correct the generated JSON data** for accuracy and proper formatting before adding it to the project.

Here’s the general workflow:

1.  **Source Material:** Identify the PDF document (or specific pages/sections) containing the quiz questions you want to add.
2.  **LLM Prompting (e.g., using Google AI Studio, OpenAI Playground with GPT-4V):**
    *   Upload or reference the PDF content.
    *   Craft prompts to instruct the LLM to extract questions and format them as JSON according to the structure defined below. Be specific about the question type you want.
    *   **Example Prompt Concept:**
        > "From the attached PDF page [Page Number], extract the multiple-choice questions. Format each question as a JSON object with the following structure: `{'question_type': 'multi_choice', 'question_title': '...', 'options': {'a': '...', 'b': '...', ...}, 'answer': ['correct_key(s)']}`. Ensure the 'answer' is an array containing the key(s) of the correct option(s)."
    *   You may need to process different question types (multiple choice, fill-in-the-blanks, drag-and-drop) separately with tailored prompts.
    *   Iterate and refine your prompts for better results.
3.  **Verification and Correction:**
    *   **Carefully review the LLM's output.** Check for:
        *   Correct extraction of question text, options, and answers.
        *   Proper JSON syntax.
        *   Adherence to the specific field names and data types required by this application (see "JSON Data Format" below).
        *   Correct identification of placeholders (`[identifier]`) for fill-in-the-blanks and drag-and-drop.
    *   Manually fix any errors or inconsistencies.
4.  **JSON File Creation:**
    *   Combine all the validated JSON question objects into a single JSON array `[...]`.
    *   Save this array in a new file **directly within the `data/` directory**. Use a descriptive name ending with `.json`, e.g., `lecture_3_quiz.json`.
5.  **Update the Manifest (Automatic):**
    *   You **do not** need to manually edit `data/quiz-manifest.json`.
    *   Simply run `build.bat` or `runServer.bat`. The build script will automatically detect your new `.json` file and add it to the manifest.
6.  **Test Locally:** Run `runServer.bat` and access the application in your browser. Select your new quiz from the list and test all questions thoroughly.
7.  **Submit a Pull Request:** Once you've tested your new quiz data and it works correctly, commit your new JSON file (you don't strictly need to commit the manifest as it's auto-generated, but it doesn't hurt) and open a Pull Request on the GitHub repository.

## JSON Data Format

Each quiz file in the `data/` directory must be a JSON array `[]` containing question objects. Each question object must have a `question_type` field and other fields depending on the type.

**(The descriptions for `multi_choice`, `fill_the_blanks`, and `drag_n_drop` remain the same as in the previous version - see below)**

**1. `multi_choice`**

*   `question_type`: `"multi_choice"`
*   `question_title`: (String) The main text of the question.
*   `options`: (Object) Key-value pairs where the key is the option identifier (e.g., "a", "b", "c") and the value is the option text.
*   `answer`: (Array) An array containing the string key(s) of the correct option(s) from the `options` object. **Must be an array even for single-answer questions.**

```json
{
  "question_type": "multi_choice",
  "question_title": "What is the capital of France?",
  "options": {
    "a": "Berlin",
    "b": "Madrid",
    "c": "Paris",
    "d": "Rome"
  },
  "answer": ["c"]
}