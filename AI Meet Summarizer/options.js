// options.js - AI Meet Summariser Settings Page Controller

document.addEventListener("DOMContentLoaded", () => {
  const apiKeyInput = document.getElementById("api-key");
  const saveBtn = document.getElementById("save-button");
  const successMsg = document.getElementById("success-message");

  // Load saved API key
  chrome.storage.sync.get(["geminiApiKey"], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Save API key
  saveBtn.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      alert("Please enter a valid Gemini API key.");
      return;
    }

    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
      successMsg.style.display = "block";
      saveBtn.setAttribute("disabled", "true");

      setTimeout(() => {
        // Close window/tab after 1.2 seconds
        window.close();
        
        // Fallback for programmatic tabs
        chrome.tabs.getCurrent((tab) => {
          if (tab) {
            chrome.tabs.remove(tab.id);
          }
        });
      }, 1200);
    });
  });
});
