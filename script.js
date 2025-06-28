// --- Global Variables and Configuration ---
const UPLOAD_BASE_URL = 'https://speech-backend-loo7.onrender.com'; // Your Render backend URL
let currentStep = 0;
let prolificId = 'debug_participant_id'; // Default for local testing; will be overwritten by Prolific ID
let mediaRecorder;
let audioChunks = [];
let currentAudioBlob = null; // Store the recorded blob for playback/upload

// Timers for tasks
let readingTimer;
let readingTimeElapsed = 0;

let pictureDescribeTimer;
let pictureDescribeTimeElapsed = 0;
const MIN_PICTURE_DESCRIPTION_DURATION = 50; // Minimum for Picture Description task (50 seconds)

let freeSpeechTimer;
let freeSpeechTimeElapsed = 0;
const MIN_FREE_SPEECH_DURATION = 90; // Minimum for Free Speech task (90 seconds)

// --- References to DOM Elements ---
const sections = [
    document.getElementById('consent-section'),
    document.getElementById('demographics-section'),
    document.getElementById('reading-section'),            // Task 1: Reading
    document.getElementById('picture-description-section'), // Task 2: Picture Description
    document.getElementById('free-speech-section'),         // Task 3: Free Speech
    document.getElementById('completion-section')
];

// Consent Section
const consentCheckbox = document.getElementById('consentCheckbox');
const startSurveyButton = document.getElementById('startSurveyButton');
const consentStatus = document.getElementById('consentStatus');

// Demographics Section
const demographicsForm = document.getElementById('demographicsForm');
const fullNameInput = document.getElementById('fullName');
const genderSelect = document.getElementById('gender');
const genderOtherInput = document.getElementById('gender_other');
const ethnicitySelect = document.getElementById('ethnicity');
const ethnicityOtherInput = document.getElementById('ethnicity_other');
const deviceSelect = document.getElementById('device');
const deviceOtherInput = document.getElementById('device_other');
const environmentSelect = document.getElementById('environment');
const environmentOtherInput = document.getElementById('environment_other');

// REMOVED references to autism-specific elements:
// const howDiagnosisMadeRadios = document.querySelectorAll('input[name="how_diagnosis_made"]');
// const howDiagnosisMadeOtherInput = document.getElementById('how_diagnosis_made_other');
// const formalAssessmentSectionDiv = document.getElementById('formal-assessment-section');
// const formalAssessmentToolRadios = document.querySelectorAll('input[name="formal_assessment_tool_used"]');
// const formalAssessmentToolSpecifyDiv = document.getElementById('formal-assessment-tool-specify');
// const exactFormalToolInput = document.getElementById('exactFormalTool');
// const autismSeverityRadios = document.querySelectorAll('input[name="autism_severity"]');
// const autismSeverityOtherInput = document.getElementById('autism_severity_other');

const submitSurveyButton = document.getElementById('submitSurveyButton');
const surveyStatus = document.getElementById('surveyStatus');

// Speech Task Elements (generic selectors for easy reuse)
const getById = (id, task) => document.getElementById(`${id}_${task}`);

// Task-specific timers displays
const readingTimerDisplay = document.getElementById('timerDisplay_reading');
const pictureDescribeTimerDisplay = document.getElementById('timerDisplay_pictureDescription');
const freeSpeechTimerDisplay = document.getElementById('timerDisplay_freeSpeech');

// Completion Section
const completionCodeSpan = document.getElementById('completionCode');

// --- Event Listeners and Initial Setup ---

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const pid = urlParams.get('PROLIFIC_PID');
    if (pid) {
        prolificId = pid;
        console.log('STUDY START: Prolific ID captured:', prolificId);
    } else {
        console.warn('STUDY START: No Prolific ID found in URL. Using debug ID:', prolificId);
    }

    showSection(currentStep);

    completionCodeSpan.textContent = `C1G15BRN`;
});

// Consent Logic
consentCheckbox.addEventListener('change', () => {
    startSurveyButton.disabled = !consentCheckbox.checked;
    if (consentCheckbox.checked) {
        consentStatus.textContent = 'Thank you for your consent. You may now continue.';
        consentStatus.classList.remove('error-message');
        consentStatus.classList.add('status-message');
    } else {
        consentStatus.textContent = 'Please check the box to continue.';
        consentStatus.classList.remove('status-message');
        consentStatus.classList.add('error-message');
    }
});

startSurveyButton.addEventListener('click', () => {
    if (consentCheckbox.checked) {
        nextSection();
    } else {
        consentStatus.textContent = 'Please check the consent box.';
        consentStatus.classList.remove('status-message');
        consentStatus.classList.add('error-message');
    }
});

// Demographics Logic - "Other" specify fields
genderSelect.addEventListener('change', () => { handleOtherSpecify(genderSelect, genderOtherInput); });
ethnicitySelect.addEventListener('change', () => { handleOtherSpecify(ethnicitySelect, ethnicityOtherInput); });
deviceSelect.addEventListener('change', () => { handleOtherSpecify(deviceSelect, deviceOtherInput); });
environmentSelect.addEventListener('change', () => { handleOtherSpecify(environmentSelect, environmentOtherInput); });

// REMOVED event listeners for autism-specific radios:
// howDiagnosisMadeRadios.forEach(radio => {
//     radio.addEventListener('change', (event) => {
//         handleOtherSpecify(event.target, howDiagnosisMadeOtherInput);
//         const showFormalAssessment = ['medical_doctor', 'licensed_psychologist', 'specialist_clinic'].includes(event.target.value);
//         toggleFormalAssessmentSection(showFormalAssessment);
//     });
// });
// formalAssessmentToolRadios.forEach(radio => {
//     radio.addEventListener('change', (event) => {
//         if (event.target.value === 'yes') {
//             formalAssessmentToolSpecifyDiv.style.display = 'block';
//             exactFormalToolInput.setAttribute('required', 'required');
//         } else {
//             formalAssessmentToolSpecifyDiv.style.display = 'none';
//             exactFormalToolInput.removeAttribute('required');
//             exactFormalToolInput.value = '';
//         }
//     });
// });
// autismSeverityRadios.forEach(radio => {
//     radio.addEventListener('change', (event) => { handleOtherSpecify(event.target, autismSeverityOtherInput); });
// });

function handleOtherSpecify(sourceElement, targetInput) {
    if (sourceElement.value === 'other' || (sourceElement.type === 'radio' && sourceElement.checked && sourceElement.value === 'other')) {
        targetInput.style.display = 'block';
        targetInput.setAttribute('required', 'required');
    } else {
        targetInput.style.display = 'none';
        targetInput.removeAttribute('required');
        targetInput.value = '';
    }
}

// REMOVED the toggleFormalAssessmentSection function entirely as it's no longer needed:
// function toggleFormalAssessmentSection(show) {
//     if (show) {
//         formalAssessmentSectionDiv.style.display = 'block';
//         formalAssessmentToolRadios.forEach(r => r.setAttribute('required', 'required'));
//     } else {
//         formalAssessmentSectionDiv.style.display = 'none';
//         formalAssessmentToolRadios.forEach(r => {
//             r.removeAttribute('required');
//             r.checked = false;
//         });
//         formalAssessmentToolSpecifyDiv.style.display = 'none';
//         exactFormalToolInput.removeAttribute('required');
//         exactFormalToolInput.value = '';
//     }
// }

demographicsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitSurveyButton.disabled = true;
    surveyStatus.textContent = 'Submitting survey...';
    surveyStatus.classList.remove('error-message');
    surveyStatus.classList.add('status-message');

    const formData = new FormData(demographicsForm);
    const data = { prolific_id: prolificId };
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    // Clean up 'other' fields if not applicable
    if (data.gender === 'other' && data.gender_other) data.gender = data.gender_other; delete data.gender_other;
    if (data.ethnicity === 'other' && data.ethnicity_other) data.ethnicity = data.ethnicity_other; delete data.ethnicity_other;
    if (data.device === 'other' && data.device_other) data.device = data.device_other; delete data.device_other;
    if (data.environment === 'other' && data.environment_other) data.environment = data.environment_other; delete data.environment_other;
    
    // REMOVED autism-specific data cleaning:
    // if (data.how_diagnosis_made === 'other' && data.how_diagnosis_made_other) data.how_diagnosis_made = data.how_diagnosis_made_other; delete data.how_diagnosis_made_other;
    // if (data.autism_severity === 'other' && data.autism_severity_other) data.autism_severity = data.autism_severity_other; delete data.autism_severity_other;

    // REMOVED formal assessment tool logic:
    // const howDiagnosisMadeValue = document.querySelector('input[name="how_diagnosis_made"]:checked')?.value;
    // const showFormalAssessmentSection = ['medical_doctor', 'licensed_psychologist', 'specialist_clinic'].includes(howDiagnosisMadeValue);
    // if (!showFormalAssessmentSection || data.formal_assessment_tool_used !== 'yes') {
    //     delete data.formal_assessment_tool_used;
    //     delete data.exactFormalTool;
    // }

    console.log('DEMOGRAPHICS: Data to send:', data);

    try {
        const response = await fetch(`${UPLOAD_BASE_URL}/save_demographics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            surveyStatus.textContent = `Survey submitted! ${result.message}`;
            console.log('DEMOGRAPHICS: Survey submission successful:', result);
            
            // --- CRITICAL FIX: Update prolificId for audio uploads ---
            // This ensures subsequent audio uploads use the correct, generated ID.
            if (result.participant_id) {
                prolificId = result.participant_id;
                console.log('DEMOGRAPHICS: Prolific ID updated for audio uploads:', prolificId);
            }
            // --- END CRITICAL FIX ---

            nextSection();
        } else {
            const errorData = await response.json();
            surveyStatus.textContent = `Survey submission failed: ${errorData.error || response.statusText}`;
            surveyStatus.classList.remove('error-message');
            surveyStatus.classList.add('error-message');
            console.error('DEMOGRAPHICS: Survey submission failed:', response.status, errorData);
        }
    } catch (error) {
        surveyStatus.textContent = `Network error during survey submission: ${error.message}`;
        surveyStatus.classList.remove('error-message');
        surveyStatus.classList.add('error-message');
        console.error('DEMOGRAPHICS: Network or survey submission error:', error);
    } finally {
        submitSurveyButton.disabled = false;
    }
});

// --- Speech Task Recording Logic (Generalized) ---
async function startRecording(taskType) {
    const startButton = getById('startButton', taskType);
    const stopButton = getById('stopButton', taskType);
    const statusDisplay = getById('status', taskType);
    const audioPlayback = getById('audioPlayback', taskType);
    const uploadNextButton = getById('uploadNextButton', taskType);
    
    let timerDisplay;
    if (taskType === 'reading') {
        timerDisplay = readingTimerDisplay;
    } else if (taskType === 'pictureDescription') {
        timerDisplay = pictureDescribeTimerDisplay;
    } else if (taskType === 'freeSpeech') { 
        timerDisplay = freeSpeechTimerDisplay;
    }

    console.log(`RECORDING: Attempting to start recording for task: ${taskType}`);

    try {
        if (!MediaRecorder.isTypeSupported('audio/webm')) {
            console.error('RECORDING ERROR: audio/webm MIME type is not supported by your browser.');
            statusDisplay.textContent = 'Error: Your browser does not support the required audio format. Please try Chrome or Firefox.';
            statusDisplay.classList.add('error-message');
            return;
        }

        audioChunks = [];
        currentAudioBlob = null;
        audioPlayback.style.display = 'none';
        audioPlayback.src = '';
        uploadNextButton.style.display = 'none';
        startButton.disabled = true;

        // Reset timer display for the current task
        if (timerDisplay) timerDisplay.textContent = '00:00'; 

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('RECORDING: Microphone access granted.');

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        mediaRecorder.ondataavailable = event => {
            console.log('RECORDING: Data available event fired.', event.data.size, 'bytes');
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            console.log('RECORDING: Recording stopped. Chunks collected:', audioChunks.length);
            // Stop media stream tracks to release microphone
            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => {
                    console.log('RECORDING: Stopping track:', track.kind);
                    track.stop();
                });
            }
            // Explicitly nullify mediaRecorder for cleanup (already in previous versions)
            mediaRecorder = null; 

            if (audioChunks.length === 0) {
                statusDisplay.textContent = 'Error: No audio data was recorded. Please check your microphone and try again.';
                statusDisplay.classList.remove('error-message');
                statusDisplay.classList.add('error-message');
                startButton.disabled = false;
                stopButton.disabled = true;
                console.error('RECORDING ERROR: audioChunks is empty after stop.');
                return;
            }

            currentAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            console.log('RECORDING: Blob created with size:', currentAudioBlob.size, 'bytes');
            const audioUrl = URL.createObjectURL(currentAudioBlob);
            audioPlayback.src = audioUrl;
            audioPlayback.style.display = 'block';
            uploadNextButton.style.display = 'block';

            statusDisplay.textContent = `Recording stopped. You can play it back, re-record, or click "Upload & Continue".`;
            statusDisplay.classList.remove('error-message');
            statusDisplay.classList.add('status-message');

            startButton.disabled = false;
            stopButton.disabled = true;

            // Stop relevant timer
            if (taskType === 'reading') stopReadingTimer();
            else if (taskType === 'pictureDescription') stopPictureDescribeTimer();
            else if (taskType === 'freeSpeech') stopFreeSpeechTimer(); 
        };

        mediaRecorder.onerror = event => {
            console.error('RECORDING ERROR: MediaRecorder encountered an error:', event.error);
            statusDisplay.textContent = `Recording error: ${event.error.name} - ${event.error.message}. Please try again.`;
            statusDisplay.classList.remove('status-message');
            statusDisplay.classList.add('error-message');
            startButton.disabled = false;
            stopButton.disabled = true;
            // Stop relevant timer on error
            if (taskType === 'reading') stopReadingTimer();
            else if (taskType === 'pictureDescription') stopPictureDescribeTimer();
            else if (taskType === 'freeSpeech') stopFreeSpeechTimer(); 
        };

        mediaRecorder.start();
        console.log('RECORDING: MediaRecorder started.');
        statusDisplay.textContent = `Recording...`;
        statusDisplay.classList.remove('error-message');
        statusDisplay.classList.add('status-message');
        startButton.disabled = true;
        stopButton.disabled = false;

        // Start relevant timer
        if (taskType === 'reading') startReadingTimer();
        else if (taskType === 'pictureDescription') startPictureDescribeTimer();
        else if (taskType === 'freeSpeech') startFreeSpeechTimer(); 

    } catch (err) {
        console.error('RECORDING ERROR: Error accessing microphone or starting MediaRecorder:', err);
        let errorMessage = 'Error: Could not access microphone. Please allow microphone access and try again.';
        if (err.name === 'NotAllowedError') {
            errorMessage = 'Microphone access denied. Please enable microphone permissions for this site in your browser settings.';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'No microphone found. Please ensure a microphone is connected.';
        }
        statusDisplay.textContent = errorMessage;
        statusDisplay.classList.remove('status-message');
        statusDisplay.classList.add('error-message');
        startButton.disabled = false;
        stopButton.disabled = true;
        // Stop relevant timer on error
        if (taskType === 'reading') stopReadingTimer();
        else if (taskType === 'pictureDescription') stopPictureDescribeTimer();
        else if (taskType === 'freeSpeech') stopFreeSpeechTimer(); 
    }
}

function stopRecording(taskType) {
    console.log(`RECORDING: Attempting to stop recording for task: ${taskType}`);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    } else {
        console.warn('RECORDING: stopRecording called but mediaRecorder is not active.');
    }
}

// --- NEW uploadAndContinue function for Direct POST to backend ---
async function uploadAndContinue(taskType) {
    if (!currentAudioBlob) {
        getById('status', taskType).textContent = 'No recording found to upload.';
        return;
    }

    const uploadNextButton = getById('uploadNextButton', taskType);
    const startButton = getById('startButton', taskType);
    const statusDisplay = getById('status', taskType);

    // Get the duration for the current task
    let durationSeconds = 0;
    if (taskType === 'reading') {
        durationSeconds = readingTimeElapsed;
    } else if (taskType === 'pictureDescription') {
        durationSeconds = pictureDescribeTimeElapsed;
    } else if (taskType === 'freeSpeech') {
        durationSeconds = freeSpeechTimeElapsed;
    }

    // Check minimum duration for specific tasks
    if (taskType === 'pictureDescription' && durationSeconds < MIN_PICTURE_DESCRIPTION_DURATION) {
        statusDisplay.textContent = `Please speak for at least ${MIN_PICTURE_DESCRIPTION_DURATION} seconds for this task. Current: ${durationSeconds} seconds.`;
        statusDisplay.classList.add('error-message');
        return;
    }
    if (taskType === 'freeSpeech' && durationSeconds < MIN_FREE_SPEECH_DURATION) {
        statusDisplay.textContent = `Please speak for at least ${MIN_FREE_SPEECH_DURATION} seconds for this task. Current: ${durationSeconds} seconds.`;
        statusDisplay.classList.add('error-message');
        return;
    }

    uploadNextButton.disabled = true;
    startButton.disabled = true;
    statusDisplay.textContent = `Uploading ${taskType} recording...`;
    statusDisplay.classList.remove('error-message'); // Clear any previous error messages
    statusDisplay.classList.add('status-message');    // Indicate progress

    try {
        const formData = new FormData();
        formData.append('audio_data', currentAudioBlob, `${taskType}.webm`);
        formData.append('participant_id', prolificId);
        formData.append('task_type', taskType);
        formData.append('duration_seconds', durationSeconds); // Include duration in form data

        console.log('UPLOAD: Sending direct POST request to:', `${UPLOAD_BASE_URL}/upload_audio`);
        const response = await fetch(`${UPLOAD_BASE_URL}/upload_audio`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Upload failed with status: ${response.status}`);
        }

        const result = await response.json();
        console.log('UPLOAD: Success:', result.message);
        statusDisplay.textContent = `Upload complete!`;
        statusDisplay.classList.remove('error-message');
        statusDisplay.classList.add('status-message');

        nextSection(); // Move to the next section only on successful upload

    } catch (error) {
        console.error('UPLOAD: Error uploading:', error);
        statusDisplay.textContent = `Upload failed: ${error.message}`;
        statusDisplay.classList.add('error-message');
        statusDisplay.classList.remove('status-message'); // Remove success styling
    } finally {
        uploadNextButton.disabled = false;
        startButton.disabled = false;
    }
}


// --- Specific Task Event Listeners ---
// Task 1: Reading
getById('startButton', 'reading').addEventListener('click', () => startRecording('reading'));
getById('stopButton', 'reading').addEventListener('click', () => stopRecording('reading'));
getById('uploadNextButton', 'reading').addEventListener('click', () => uploadAndContinue('reading'));

// Task 2: Picture Description
getById('startButton', 'pictureDescription').addEventListener('click', () => startRecording('pictureDescription'));
getById('stopButton', 'pictureDescription').addEventListener('click', () => stopRecording('pictureDescription'));
getById('uploadNextButton', 'pictureDescription').addEventListener('click', () => uploadAndContinue('pictureDescription'));

// Task 3: Free Speech
getById('startButton', 'freeSpeech').addEventListener('click', () => startRecording('freeSpeech'));
getById('stopButton', 'freeSpeech').addEventListener('click', () => stopRecording('freeSpeech'));
getById('uploadNextButton', 'freeSpeech').addEventListener('click', () => uploadAndContinue('freeSpeech'));


// --- Timed Task Logic ---
function startReadingTimer() {
    readingTimeElapsed = 0;
    readingTimerDisplay.textContent = '00:00';
    clearInterval(readingTimer);
    readingTimer = setInterval(() => {
        readingTimeElapsed++;
        const minutes = String(Math.floor(readingTimeElapsed / 60)).padStart(2, '0');
        const seconds = String(Math.floor(readingTimeElapsed % 60)).padStart(2, '0');
        readingTimerDisplay.textContent = `${minutes}:${seconds}`; 
    }, 1000);
}

function stopReadingTimer() {
    clearInterval(readingTimer);
}

function startPictureDescribeTimer() { // No auto-stop now
    pictureDescribeTimeElapsed = 0;
    pictureDescribeTimerDisplay.textContent = '00:00';
    clearInterval(pictureDescribeTimer);
    pictureDescribeTimer = setInterval(() => {
        pictureDescribeTimeElapsed++;
        const minutes = String(Math.floor(pictureDescribeTimeElapsed / 60)).padStart(2, '0');
        const seconds = String(Math.floor(pictureDescribeTimeElapsed % 60)).padStart(2, '0');
        pictureDescribeTimerDisplay.textContent = `${minutes}:${seconds}`; 
    }, 1000);
}

function stopPictureDescribeTimer() {
    clearInterval(pictureDescribeTimer);
}

function startFreeSpeechTimer() { // No auto-stop now
    freeSpeechTimeElapsed = 0;
    freeSpeechTimerDisplay.textContent = '00:00';
    clearInterval(freeSpeechTimer);
    freeSpeechTimer = setInterval(() => {
        freeSpeechTimeElapsed++;
        const minutes = String(Math.floor(freeSpeechTimeElapsed / 60)).padStart(2, '0');
        const seconds = String(Math.floor(freeSpeechTimeElapsed % 60)).padStart(2, '0');
        freeSpeechTimerDisplay.textContent = `${minutes}:${seconds}`; 
    }, 1000);
}

function stopFreeSpeechTimer() {
    clearInterval(freeSpeechTimer);
}

// --- Core Navigation and Upload Functions ---

function showSection(index) {
    sections.forEach((section, i) => {
        section.style.display = (i === index) ? 'block' : 'none';
    });
    currentStep = index;
    window.scrollTo(0, 0);
}

function nextSection() {
    if (currentStep < sections.length - 1) {
        currentStep++;
        showSection(currentStep);
    }
}