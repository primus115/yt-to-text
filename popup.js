document.addEventListener('DOMContentLoaded', function() {
  const getTranscriptButton = document.getElementById('get-transcript');
  const copyTranscriptButton = document.getElementById('copy-transcript');
  const transcriptContainer = document.getElementById('transcript-container');
  const transcriptText = document.getElementById('transcript-text');
  const statusMessage = document.getElementById('status-message');
  
  let currentTranscript = '';

  // Get the current tab
  async function getCurrentTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs[0];
  }

  // Extract video ID from YouTube URL
  function extractVideoId(url) {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.substring(1);
    }
    return null;
  }

  // Function to fetch transcript
  async function fetchTranscript(videoId) {
    try {
      statusMessage.textContent = 'Fetching transcript...';
      
      // Get the current tab
      const tab = await getCurrentTab();
      
      // Execute script in the active tab to access YouTube's transcript data
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // This function runs in the context of the YouTube page
          function extractTranscriptData() {
            // Method 1: Try to find transcript in YouTube's window.ytInitialPlayerResponse
            if (window.ytInitialPlayerResponse && 
                window.ytInitialPlayerResponse.captions && 
                window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer) {
              
              const captionTracks = window.ytInitialPlayerResponse.captions
                .playerCaptionsTracklistRenderer.captionTracks;
              
              if (captionTracks && captionTracks.length > 0) {
                // Get the first available caption track (usually default language)
                const firstTrack = captionTracks[0];
                return { type: 'url', data: firstTrack.baseUrl };
              }
            }
            
            // Method 2: Try to extract directly from the transcript panel if it's open
            const transcriptItems = document.querySelectorAll('yt-formatted-string.ytd-transcript-segment-renderer');
            if (transcriptItems && transcriptItems.length > 0) {
              let transcript = '';
              transcriptItems.forEach(item => {
                transcript += item.textContent.trim() + ' ';
              });
              return { type: 'text', data: transcript };
            }
            
            // Method 3: Try to find and click the transcript button to open the panel
            const menuButtons = document.querySelectorAll('button.ytp-button');
            let transcriptButton = null;
            
            for (const button of menuButtons) {
              if (button.getAttribute('aria-label') && 
                  button.getAttribute('aria-label').includes('transcript')) {
                transcriptButton = button;
                break;
              }
            }
            
            if (transcriptButton) {
              // We found the transcript button, but we'll need another approach
              // to actually get the transcript after clicking
              return { type: 'button_found', data: null };
            }
            
            // Method 4: Try to find transcript in the page data
            const scripts = document.querySelectorAll('script');
            for (const script of scripts) {
              const content = script.textContent;
              if (content && content.includes('"captionTracks"')) {
                const match = content.match(/"captionTracks":\[(.+?)\]/);
                if (match && match[1]) {
                  const captionData = match[1];
                  const urlMatch = captionData.match(/"baseUrl":"([^"]+)"/);
                  if (urlMatch && urlMatch[1]) {
                    return { type: 'url', data: urlMatch[1].replace(/\\u0026/g, '&') };
                  }
                }
              }
            }
            
            return { type: 'not_found', data: null };
          }
          
          return extractTranscriptData();
        }
      });
      
      const transcriptData = result[0].result;
      
      if (!transcriptData || transcriptData.type === 'not_found' || 
          (transcriptData.type === 'button_found' && !transcriptData.data)) {
        throw new Error('Transcript not available for this video');
      }
      
      // If we already have the transcript text
      if (transcriptData.type === 'text') {
        return transcriptData.data;
      }
      
      // If we have a URL to fetch the transcript
      if (transcriptData.type === 'url') {
        // Fetch the transcript XML
        const response = await fetch(transcriptData.data);
        const xmlText = await response.text();
        
        // Parse XML to extract transcript text
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const textElements = xmlDoc.getElementsByTagName('text');
        
        let fullTranscript = '';
        for (let i = 0; i < textElements.length; i++) {
          fullTranscript += textElements[i].textContent + ' ';
        }
        
        return fullTranscript.trim();
      }
      
      throw new Error('Could not extract transcript');
    } catch (error) {
      throw new Error(`Failed to fetch transcript: ${error.message}`);
    }
  }

  // Handle Get Transcript button click
  getTranscriptButton.addEventListener('click', async () => {
    try {
      const tab = await getCurrentTab();
      const videoId = extractVideoId(tab.url);
      
      if (!videoId) {
        statusMessage.textContent = 'Not a valid YouTube video URL';
        return;
      }
      
      currentTranscript = await fetchTranscript(videoId);
      
      transcriptText.textContent = currentTranscript;
      transcriptContainer.style.display = 'block';
      copyTranscriptButton.disabled = false;
      statusMessage.textContent = 'Transcript loaded successfully!';
    } catch (error) {
      statusMessage.textContent = error.message;
      transcriptContainer.style.display = 'none';
      copyTranscriptButton.disabled = true;
    }
  });

  // Handle Copy to Clipboard button click
  copyTranscriptButton.addEventListener('click', () => {
    if (!currentTranscript) {
      statusMessage.textContent = 'No transcript to copy';
      return;
    }
    
    navigator.clipboard.writeText(currentTranscript)
      .then(() => {
        statusMessage.textContent = 'Transcript copied to clipboard!';
        
        // Visual feedback
        copyTranscriptButton.textContent = 'Copied!';
        setTimeout(() => {
          copyTranscriptButton.textContent = 'Copy to Clipboard';
        }, 2000);
      })
      .catch(err => {
        statusMessage.textContent = `Failed to copy: ${err}`;
      });
  });
});
