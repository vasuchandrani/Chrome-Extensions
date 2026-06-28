// popup.js - AI Meet Summariser Popup Controller

let currentActiveTabId = null;
let apiKey = null;
let currentMeetingTitle = "Google Meet";
let finalizedTranscript = [];

// DOM Elements
const openSettingsBtn = document.getElementById("open-settings");
const configureKeyLink = document.getElementById("configure-key");
const toggleCaptureBtn = document.getElementById("toggle-capture-btn");
const clearBtn = document.getElementById("clear-btn");
const generateReportsBtn = document.getElementById("generate-reports-btn");
const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");

const apiKeyAlert = document.getElementById("api-key-alert");
const notMeetAlert = document.getElementById("not-meet-alert");
const captionsAlert = document.getElementById("captions-alert");

const meetTitleEl = document.getElementById("meet-title");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const captureStatusPill = document.getElementById("capture-status");

const transcriptContainer = document.getElementById("transcript-container");
const summaryContainer = document.getElementById("summary-container");
const qaContainer = document.getElementById("qa-container");
const tasksContainer = document.getElementById("tasks-container");

// Initialize Popup
document.addEventListener("DOMContentLoaded", async () => {
  // Load Settings Options link click
  openSettingsBtn.addEventListener("click", openOptionsPage);
  configureKeyLink.addEventListener("click", openOptionsPage);

  // Setup tabs toggling
  initTabs();

  // Load API Key
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKey = result.geminiApiKey;
      apiKeyAlert.style.display = "none";
      generateReportsBtn.removeAttribute("disabled");
    } else {
      apiKeyAlert.style.display = "block";
      generateReportsBtn.setAttribute("disabled", "true");
    }
  });

  // Verify Tab context
  checkCurrentTab();

  // Start polling transcript updates
  setInterval(pollTranscript, 1000);

  // Setup Actions Click listeners
  toggleCaptureBtn.addEventListener("click", handleToggleCapture);
  clearBtn.addEventListener("click", handleClearTranscript);
  generateReportsBtn.addEventListener("click", handleGenerateReports);
  copyBtn.addEventListener("click", handleCopyActiveTab);
  downloadBtn.addEventListener("click", handleDownloadReport);
});

// Tab navigation handler
function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Deactivate all tabs
      document.querySelectorAll(".tab-btn").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));

      // Activate clicked tab
      tab.classList.add("active");
      const panelId = tab.getAttribute("data-tab");
      document.getElementById(panelId).classList.add("active");
    });
  });
}

function openOptionsPage(e) {
  if (e) e.preventDefault();
  chrome.runtime.openOptionsPage();
}

// Check if active tab is Google Meet
function checkCurrentTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) return;
    const tab = tabs[0];
    
    if (tab.url && tab.url.includes("meet.google.com")) {
      currentActiveTabId = tab.id;
      notMeetAlert.style.display = "none";
      toggleCaptureBtn.removeAttribute("disabled");
      
      // Query content script status
      chrome.tabs.sendMessage(tab.id, { type: "CHECK_STATUS" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not loaded (possibly on meeting join page or not fully loaded)
          updateUIState(false, false);
        } else if (response) {
          updateUIState(response.isCapturing, response.captionsEnabled);
          if (response.title) {
            currentMeetingTitle = response.title;
            meetTitleEl.textContent = response.title;
          }
        }
      });
    } else {
      notMeetAlert.style.display = "block";
      toggleCaptureBtn.setAttribute("disabled", "true");
      meetTitleEl.textContent = "Not in a Google Meet";
      updateUIState(false, false);
    }
  });
}

// Update Controls UI
function updateUIState(isCapturing, captionsEnabled) {
  if (isCapturing) {
    statusDot.className = "recording-dot";
    statusText.textContent = "Capturing";
    captureStatusPill.className = "status-pill status-capturing";
    
    toggleCaptureBtn.className = "btn-danger";
    toggleCaptureBtn.innerHTML = "<span>■</span> Stop Capturing";
    clearBtn.setAttribute("disabled", "true");
  } else {
    statusDot.className = "";
    statusText.textContent = "Inactive";
    captureStatusPill.className = "status-pill";
    
    toggleCaptureBtn.className = "btn-primary";
    toggleCaptureBtn.innerHTML = "<span>▶</span> Start Capturing";
  }

  // Handle caption indicator warnings
  if (currentActiveTabId) {
    if (!captionsEnabled) {
      captionsAlert.style.display = "block";
    } else {
      captionsAlert.style.display = "none";
    }
  } else {
    captionsAlert.style.display = "none";
  }
}

// Toggle capturing state
function handleToggleCapture() {
  if (!currentActiveTabId) return;

  chrome.tabs.sendMessage(currentActiveTabId, { type: "CHECK_STATUS" }, (status) => {
    if (chrome.runtime.lastError) {
      alert("Please refresh the Google Meet page to initialize the caption observer.");
      return;
    }
    
    if (status && status.isCapturing) {
      // Stop Capturing
      chrome.tabs.sendMessage(currentActiveTabId, { type: "STOP_CAPTURE" }, (res) => {
        updateUIState(false, status.captionsEnabled);
        pollTranscript();
      });
    } else {
      // Start Capturing
      // Check if captions are enabled first as a reminder, but allow starting anyway
      chrome.tabs.sendMessage(currentActiveTabId, { type: "START_CAPTURE" }, (res) => {
        if (res && res.success) {
          updateUIState(true, status.captionsEnabled);
        } else {
          alert("Could not start capture. Please verify that closed captions (CC) are enabled in Google Meet.");
        }
        pollTranscript();
      });
    }
  });
}

// Clear Transcript handler
function handleClearTranscript() {
  if (confirm("Are you sure you want to clear the current meeting transcript and AI reports?")) {
    if (currentActiveTabId) {
      chrome.tabs.sendMessage(currentActiveTabId, { type: "CLEAR_TRANSCRIPT" }, (res) => {
        chrome.storage.local.set({
          meetTranscript: [],
          liveCaption: null,
          meetSummary: null,
          meetQA: null,
          meetTasks: null
        }, () => {
          pollTranscript();
        });
      });
    } else {
      chrome.storage.local.set({
        meetTranscript: [],
        liveCaption: null,
        meetSummary: null,
        meetQA: null,
        meetTasks: null
      }, () => {
        pollTranscript();
      });
    }
  }
}

// Poll transcript from chrome storage
function pollTranscript() {
  chrome.storage.local.get(
    ["meetTranscript", "liveCaption", "isCapturing", "meetingTitle", "meetSummary", "meetQA", "meetTasks"],
    (data) => {
      // Update capturing state
      if (data.isCapturing !== undefined && currentActiveTabId) {
        // Query captions setting again
        chrome.tabs.sendMessage(currentActiveTabId, { type: "CHECK_STATUS" }, (response) => {
          if (!chrome.runtime.lastError && response) {
            updateUIState(data.isCapturing, response.captionsEnabled);
            if (response.title) {
              currentMeetingTitle = response.title;
              meetTitleEl.textContent = response.title;
            }
          }
        });
      }

      // Update Transcript UI
      finalizedTranscript = data.meetTranscript || [];
      const liveCaption = data.liveCaption;

      if (finalizedTranscript.length === 0 && !liveCaption) {
        transcriptContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <p>No transcript recorded yet.</p>
            <p style="font-size: 11px; opacity: 0.8;">Start capturing during a Google Meet call with captions turned on.</p>
          </div>`;
        clearBtn.setAttribute("disabled", "true");
        copyBtn.setAttribute("disabled", "true");
        downloadBtn.setAttribute("disabled", "true");
      } else {
        clearBtn.removeAttribute("disabled");
        copyBtn.removeAttribute("disabled");
        downloadBtn.removeAttribute("disabled");
        
        let html = '<div class="transcript-list">';
        
        finalizedTranscript.forEach((turn) => {
          html += `
            <div class="transcript-item">
              <div class="speaker-header">
                <span class="speaker-name">${escapeHtml(turn.speaker)}</span>
                <span class="speaker-time">[${turn.elapsed || turn.time}]</span>
              </div>
              <p class="speaker-text">${escapeHtml(turn.text)}</p>
            </div>`;
        });

        // Show live unfinalized speaker text
        if (liveCaption && liveCaption.text) {
          html += `
            <div class="transcript-item live-item">
              <div class="speaker-header">
                <span class="speaker-name">
                  <div class="live-pulse"></div>
                  ${escapeHtml(liveCaption.speaker)}
                </span>
                <span class="speaker-time">Speaking Live</span>
              </div>
              <p class="speaker-text">${escapeHtml(liveCaption.text)}</p>
            </div>`;
        }

        html += '</div>';
        
        // Only update HTML if changed to prevent screen flicker and cursor reset
        if (transcriptContainer.innerHTML !== html) {
          const isAtBottom = transcriptContainer.scrollHeight - transcriptContainer.clientHeight <= transcriptContainer.scrollTop + 40;
          transcriptContainer.innerHTML = html;
          if (isAtBottom) {
            transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
          }
        }
      }

      // Update Summary UI
      if (data.meetSummary) {
        summaryContainer.innerHTML = renderMarkdownToHtml(data.meetSummary);
      } else {
        summaryContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>No summary generated.</p>
            <p style="font-size: 11px; opacity: 0.8;">Click 'Generate AI Reports' below to summarize the meeting.</p>
          </div>`;
      }

      // Update Q&A UI
      if (data.meetQA) {
        qaContainer.innerHTML = renderMarkdownToHtml(data.meetQA);
      } else {
        qaContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">❓</div>
            <p>No Q&A pairs generated.</p>
            <p style="font-size: 11px; opacity: 0.8;">Click 'Generate AI Reports' below to extract questions and answers.</p>
          </div>`;
      }

      // Update Tasks UI
      if (data.meetTasks) {
        tasksContainer.innerHTML = renderMarkdownToHtml(data.meetTasks);
      } else {
        tasksContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">✅</div>
            <p>No action items extracted.</p>
            <p style="font-size: 11px; opacity: 0.8;">Click 'Generate AI Reports' below to find tasks and action items.</p>
          </div>`;
      }
    }
  );
}

// Generate Summaries via Gemini API
async function handleGenerateReports() {
  if (!apiKey) {
    alert("Please set your Gemini API key in the extension options.");
    openOptionsPage();
    return;
  }

  if (finalizedTranscript.length === 0) {
    alert("The transcript is empty. Capture some captions before generating summaries.");
    return;
  }

  // Set loading states
  generateReportsBtn.setAttribute("disabled", "true");
  generateReportsBtn.innerHTML = "✨ Generating reports...";
  
  summaryContainer.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:180px;"><div style="border: 3px solid rgba(255,255,255,0.05); border-top: 3px solid #7c3aed; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite;"></div></div>';
  qaContainer.innerHTML = summaryContainer.innerHTML;
  tasksContainer.innerHTML = summaryContainer.innerHTML;

  // Append spinning style if not already in document
  if (!document.getElementById("loading-spin-style")) {
    const style = document.createElement("style");
    style.id = "loading-spin-style";
    style.innerHTML = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";
    document.head.appendChild(style);
  }

  // Compile full plain-text transcript
  const transcriptText = finalizedTranscript
    .map((turn) => `[${turn.elapsed || turn.time}] ${turn.speaker}: ${turn.text}`)
    .join("\n");

  try {
    // Generate Overall Summary
    const summaryPrompt = `Provide a structured summary of the following meeting transcript. Begin with a 2-3 sentence Executive Summary. Then, provide bullet points of the main discussion topics and decisions made. Use simple markdown formatting. Do not include markdown banners or codeblocks. Transcript:\n\n${transcriptText}`;
    const summary = await callGeminiAPI(summaryPrompt);
    chrome.storage.local.set({ meetSummary: summary });

    // Generate Q&A
    const qaPrompt = `Analyze the following meeting transcript and identify all questions asked and their corresponding answers. Format them clearly as Q&A pairs (e.g. **Q: [Question]** asked by [Name]\n**A: [Answer]** answered by [Name]). If a question was not answered, note it as "Answer not found in meeting". Only include actual questions and answers discussed. If no questions were asked, write "No questions detected in this meeting." Do not use codeblocks. Transcript:\n\n${transcriptText}`;
    const qa = await callGeminiAPI(qaPrompt);
    chrome.storage.local.set({ meetQA: qa });

    // Generate Tasks
    const tasksPrompt = `Extract all tasks, action items, next steps, and todo items from the following meeting transcript. For each task, specify who is assigned to it (if mentioned) and what needs to be done. Format them as a Markdown checklist (e.g. - [ ] Task name - Assigned to: [Name]). If no tasks were discussed, write "No action items or tasks detected." Do not use codeblocks. Transcript:\n\n${transcriptText}`;
    const tasks = await callGeminiAPI(tasksPrompt);
    chrome.storage.local.set({ meetTasks: tasks });

    // Force tab update
    pollTranscript();
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    alert(`Failed to generate AI summaries: ${error.message}`);
    pollTranscript();
  } finally {
    generateReportsBtn.removeAttribute("disabled");
    generateReportsBtn.innerHTML = "✨ Generate AI Reports";
  }
}

// Call Gemini 1.5 Flash API
async function callGeminiAPI(prompt) {
  const maxChars = 32000;
  const truncatedPrompt = prompt.length > maxChars ? prompt.substring(0, maxChars) + "..." : prompt;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: truncatedPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
        },
      }),
    }
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.message || "API request failed");
  }

  const data = await res.json();
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No report generated."
  );
}

// Copy active tab content
function handleCopyActiveTab() {
  const activeTabBtn = document.querySelector(".tab-btn.active");
  if (!activeTabBtn) return;

  const tabId = activeTabBtn.getAttribute("data-tab");
  let text = "";

  if (tabId === "tab-transcript") {
    text = finalizedTranscript
      .map((turn) => `[${turn.elapsed || turn.time}] ${turn.speaker}: ${turn.text}`)
      .join("\n");
  } else if (tabId === "tab-summary") {
    text = summaryContainer.innerText;
  } else if (tabId === "tab-qa") {
    text = qaContainer.innerText;
  } else if (tabId === "tab-tasks") {
    text = tasksContainer.innerText;
  }

  if (text.trim() === "") {
    alert("Tab content is empty. Nothing to copy.");
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    const originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = "Copied!";
    setTimeout(() => {
      copyBtn.innerHTML = originalText;
    }, 2000);
  }).catch((err) => {
    console.error("Copy failed:", err);
  });
}

// Download full report as Markdown file
function handleDownloadReport() {
  chrome.storage.local.get(["meetTranscript", "meetSummary", "meetQA", "meetTasks"], (data) => {
    const summary = data.meetSummary || "No summary generated.";
    const qa = data.meetQA || "No Q&A pairs generated.";
    const tasks = data.meetTasks || "No tasks extracted.";
    const transcriptText = (data.meetTranscript || [])
      .map((turn) => `## ${turn.speaker} [${turn.elapsed || turn.time}]\n\n${turn.text}\n`)
      .join("\n");

    const markdownContent = `# Meeting Report: ${currentMeetingTitle}
Date: ${new Date().toLocaleString()}

---

## Executive Summary
${summary}

---

## Questions & Answers
${qa}

---

## Action Items & Tasks
${tasks}

---

## Full Transcript
${transcriptText || "_No transcript text available._"}
`;

    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Formatting title filename
    const safeTitle = currentMeetingTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    link.href = url;
    link.download = `meeting-report-${safeTitle || "gmeet"}-${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// Escaping text to prevent DOM injection
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Simple Markdown to HTML Renderer
function renderMarkdownToHtml(mdText) {
  if (!mdText) return "";
  
  // Escape raw HTML tags
  let html = escapeHtml(mdText);

  // Bold (**text**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Checkboxes (- [ ] or - [x])
  html = html.replace(/- \[\s\]\s(.*?)(?=\n|$)/g, "<div><input type='checkbox' disabled> $1</div>");
  html = html.replace(/- \[x\]\s(.*?)(?=\n|$)/g, "<div><input type='checkbox' checked disabled> $1</div>");

  // Headings (### heading)
  html = html.replace(/### (.*?)(?=\n|$)/g, "<h3>$1</h3>");
  html = html.replace(/## (.*?)(?=\n|$)/g, "<h2>$1</h2>");
  html = html.replace(/# (.*?)(?=\n|$)/g, "<h1>$1</h1>");

  // Bullet Points (- item)
  html = html.replace(/^- (.*?)(?=\n|$)/gm, "<li>$1</li>");
  
  // Wrap li groups in ul (approximate)
  html = html.replace(/(<li>.*?<\/li>)/gs, "<ul>$1</ul>");
  // Clean redundant nested uls
  html = html.replace(/<\/ul>\s*<ul>/g, "");

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  return html;
}
