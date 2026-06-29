# Chrome Extensions Collection

A collection of AI-powered Google Chrome extensions built with support for multiple AI providers (Google Gemini, OpenAI, and Hugging Face). These extensions run entirely in the browser, offering secure, localized, and fast assistance for everyday web tasks.

---

## Extensions in this Repository

### 1. [AI Article Summarizer](./AI%20Article%20Summarizer/)
A smart reading companion that extracts page text from any web article and summarizes it instantly.

*   **Usecase**: Ideal for students, researchers, and professionals who need to quickly evaluate page relevance and digest long-form reading content.
*   **Key Features**:
    *   **Multi-Provider Support**: Configure Google Gemini, OpenAI, or Hugging Face.
    *   **Three Summary Modes**: Brief Summary (2-3 sentences), Detailed Summary (deep analytical overview), or Bullet Points (5-7 key insights).
    *   **One-Click Copy**: Fast clipboard integration to save and share summaries.
    *   **Model Selection Dropdown**: Easily choose from a list of stable production models in options.
*   **Folder Location**: [`./AI Article Summarizer`](./AI%20Article%20Summarizer/)

### 2. [AI Meet Summarizer](./AI%20Meet%20Summarizer/)
A real-time meeting transcription and note-taking assistant designed for Google Meet calls.

*   **Usecase**: Perfect for remote teams, product managers, and educators who want to automate transcription, trace decisions, and log deliverables without using external bots or cloud services.
*   **Key Features**:
    *   **Local DOM Transcription**: Real-time closed captions observation that requires no device microphone permissions or recording audio streams.
    *   **Real-Time Dynamic Captures**: Appends spoken words character-by-character and merges speaker blocks dynamically in real-time, capturing 100% of spoken paragraphs.
    *   **AI Report Suite**: Generates a general Executive Summary, isolates Question-and-Answer (Q&A) pairs, and extracts checklist tasks.
    *   **Markdown Reports**: Download full meeting reports (including transcript, summary, Q&As, and tasks) as a single `.md` file.
*   **Folder Location**: [`./AI Meet Summarizer`](./AI%20Meet%20Summarizer/)

---

## Global Setup & Installation

All extensions are structured as standard Manifest V3 configurations and can be easily loaded into any Chromium browser (Google Chrome, Microsoft Edge, Brave, etc.) on **macOS**, **Windows**, or **Linux**.

### Step 1: Clone the Repository
```bash
git clone https://github.com/vasuchandrani/Chrome-Extensions.git
cd Chrome-Extensions
```

### Step 2: Load the Extensions in Chrome
1.  Open Chrome and navigate to `chrome://extensions/` in the address bar.
2.  Enable **Developer mode** using the toggle switch in the top-right corner.
3.  Click the **Load unpacked** button in the top-left corner.
4.  Navigate to the repository folder and select either:
    *   `AI Article Summarizer` folder
    *   `AI Meet Summarizer` folder
5.  The extension icon will now appear in your browser's toolbar.

### Step 3: Get and Configure your API Key
Both extensions utilize your own API key to perform content processing.
1.  Go to your chosen dashboard:
    *   [Google AI Studio](https://aistudio.google.com/) for Gemini API Keys.
    *   [OpenAI Platform](https://platform.openai.com/api-keys) for OpenAI API Keys.
    *   [Hugging Face Portal](https://huggingface.co/settings/tokens) for Hugging Face User Access Tokens.
2.  Open the extension settings (or options page):
    *   For **AI Article Summarizer**: Right-click the extension icon -> **Options**.
    *   For **AI Meet Summarizer**: Click the extension icon -> click **⚙️ API Key** in the header.
3.  Choose your provider, enter your key/token, select your model, and click **Save Settings**.