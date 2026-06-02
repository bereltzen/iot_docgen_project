/**
 * ==========================================================================
 * IoT-DocGen Web Application Engine (Vanilla ES6)
 * Handles state management, tabs, simulated pipeline logging, and Live API.
 * ==========================================================================
 */

// --- 1. MOCK IOT DATASETS ---
const IoT_EXAMPLES = {
    "env-sensor": {
        name: "ENV-SENSOR-8832 (Weather Station)",
        files: {
            "device_config.json": `{
  "deviceId": "ENV-SENSOR-8832",
  "firmware_version": "v2.1.4-beta",
  "protocols": ["MQTT", "HTTP"],
  "telemetryIntervalMs": 5000,
  "supported_sensors": ["temperature", "humidity", "co2_ppm"],
  "status": "active"
}`,
            "extra_notes.txt": `Hey team, a few things to remember for the docs:
- The /reboot endpoint requires an "X-API-Key" header to pass verify_admin().
- Rate limiting is active: max 10 requests per minute on the current readings endpoint to prevent hardware lockup.
- The co2_ppm sensor sometimes returns -1 if it's still calibrating.
- Base URL is usually http://<device_ip>:8080`,
            "handler_snippet.py": `# quick n dirty router for the sensor hub
@app.route('/api/v1/sensors/current', methods=['GET'])
def get_current_readings():
    # Returns all active sensors.
    # Output format: {"temp": 22.5, "hum": 45, "co2": 420}
    return fetch_hardware_registers()

@app.route('/api/v1/system/reboot', methods=['POST'])
def trigger_reboot():
    # warning: takes about 45 seconds to come back online
    if not verify_admin(request):
        return {"error": "unauthorized"}, 401
    hardware.reboot()
    return {"status": "rebooting"}`
        },
        markdown: `# ENV-SENSOR-8832 API Documentation
**Firmware Version:** v2.1.4-beta | **Status:** active | **Protocols:** MQTT, HTTP

## 1. Overview
The ENV-SENSOR-8832 is a low-power environmental monitoring node designed to capture physical metrics (temperature, humidity, and CO2 level). It supports MQTT for real-time telemetry publishing (every 5000ms) and HTTP for diagnostic polling and controls.

## 2. Authentication
All administrative endpoints require authentication to prevent unauthorized device configuration:
* **Header:** \`X-API-Key\`
* **Bypass:** Local GET requests do not require key verification, but are subject to hardware-level rate limiting.

## 3. Endpoints

### GET /api/v1/sensors/current
* **Description:** Retrieves the latest reading of all active, online environmental registers.
* **Rate Limits / Constraints:** Maximum of 10 requests per minute to prevent local hardware register starvation or bus lockup.
* **Request Structure:**
  * No headers or parameters required.
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  {
    "temp": 22.5,
    "hum": 45,
    "co2": 420
  }
  \`\`\`

### POST /api/v1/system/reboot
* **Description:** Triggers a hard warm-reboot cycle on the device controller.
* **Rate Limits / Constraints:** Requires high administrative privilege. Note that the sensor takes approximately 45 seconds to restart and resume publishing telemetry.
* **Request Structure:**
  * **Headers:**
    | Header | Type | Description |
    | :--- | :--- | :--- |
    | \`X-API-Key\` | String | Administrative secret API key |
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  {
    "status": "rebooting"
  }
  \`\`\`
  * **Status 401 Unauthorized**
  \`\`\`json
  {
    "error": "unauthorized"
  }
  \`\`\`

## 4. Error Codes & Edge Cases
* **CO2 Calibration State:** If the CO2 sensor has been recently powered, it may return a value of \`-1\`. Clients should wait up to 5 minutes for calibration to complete.
* **Rate Limit Failure:** Exceeding 10 requests per minute will temporarily freeze register access. Wait 60 seconds for the token bucket to replenish.
* **Warm Boot Downtime:** A system reboot causes a 45-second telemetry outage; clients should silence missing connection alarms during this period.`
    },
    "smart-lock": {
        name: "LOCK-SECURE-99X (Smart Door Lock)",
        files: {
            "device_config.json": `{
  "deviceId": "LOCK-SECURE-99X",
  "firmware_version": "v1.4.2-stable",
  "protocols": ["HTTP", "BLE"],
  "status": "secured",
  "battery_level": "87%",
  "hardware_rev": "Rev-C"
}`,
            "notes_firmware.txt": `Developer Notes:
- The /api/v2/unlock and /api/v2/lock endpoints require JWT token in "Authorization: Bearer <token>" header.
- A temporary override code (PIN) can be sent to /api/v2/override but requires "X-Admin-PIN" header.
- Lock hardware has a safety mechanism: If 5 consecutive failed unlock attempts occur, it triggers an alarm state and locks down for 15 minutes.
- Hardware lock/unlock takes about 3 seconds to actuate.`,
            "handlers.py": `@app.route('/api/v2/lock', methods=['POST'])
def lock_door():
    # Locks the deadbolt mechanism
    if not validate_jwt(request):
        return {"error": "unauthenticated"}, 401
    return actuate_lock(state="locked")

@app.route('/api/v2/unlock', methods=['POST'])
def unlock_door():
    # Unlocks the deadbolt mechanism
    if not validate_jwt(request):
        return {"error": "unauthenticated"}, 401
    return actuate_lock(state="unlocked")

@app.route('/api/v2/override', methods=['POST'])
def admin_override():
    # Emergency override pin authentication
    pin = request.headers.get('X-Admin-PIN')
    if pin == CONFIG['ADMIN_PIN']:
        actuate_lock(state="unlocked")
        return {"status": "override_success", "actuated": "unlocked"}
    register_failed_attempt()
    return {"status": "failed", "reason": "invalid PIN"}, 403`
        },
        markdown: `# LOCK-SECURE-99X API Documentation
**Firmware Version:** v1.4.2-stable | **Status:** secured | **Protocols:** HTTP, BLE

## 1. Overview
The LOCK-SECURE-99X smart door lock is an automated deadbolt locking controller. It supports localized BLE communication for close-range mobile unlock, and HTTP endpoints via Wi-Fi for remote security administration. 

## 2. Authentication
Standard locking and unlocking calls require a JSON Web Token (JWT):
* **Header:** \`Authorization: Bearer <jwt-token>\`
* **Emergency Override:** Bypass standard token auth by sending the master lock code:
  * **Header:** \`X-Admin-PIN\`

## 3. Endpoints

### POST /api/v2/lock
* **Description:** Actuates the physical locking motor to slide the deadbolt locked.
* **Rate Limits / Constraints:** The physical actuator requires 3 seconds to lock. Rapid consecutive calls will return busy or lockup errors.
* **Request Structure:**
  * **Headers:**
    | Header | Type | Description |
    | :--- | :--- | :--- |
    | \`Authorization\` | String | Valid JWT bearer token (\`Bearer <token>\`) |
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  {
    "status": "locked",
    "actuator_duration_ms": 3000
  }
  \`\`\`
  * **Status 401 Unauthorized**
  \`\`\`json
  {
    "error": "unauthenticated"
  }
  \`\`\`

### POST /api/v2/unlock
* **Description:** Actuates the physical deadbolt motor to slide open.
* **Rate Limits / Constraints:** Physical actuator requires 3 seconds to complete unlock cycle.
* **Request Structure:**
  * **Headers:**
    | Header | Type | Description |
    | :--- | :--- | :--- |
    | \`Authorization\` | String | Valid JWT bearer token (\`Bearer <token>\`) |
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  {
    "status": "unlocked",
    "actuator_duration_ms": 3000
  }
  \`\`\`
  * **Status 401 Unauthorized**
  \`\`\`json
  {
    "error": "unauthenticated"
  }
  \`\`\`

### POST /api/v2/override
* **Description:** Emergency unlock bypass. Authenticates with a numerical PIN stored in hardware.
* **Rate Limits / Constraints:** Any failed attempt is written immediately to volatile audit memory.
* **Request Structure:**
  * **Headers:**
    | Header | Type | Description |
    | :--- | :--- | :--- |
    | \`X-Admin-PIN\` | String | Administrator emergency bypass numerical PIN |
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  {
    "status": "override_success",
    "actuated": "unlocked"
  }
  \`\`\`
  * **Status 403 Forbidden**
  \`\`\`json
  {
    "status": "failed",
    "reason": "invalid PIN"
  }
  \`\`\`

## 4. Error Codes & Edge Cases
* **Lockdown Mode (Brute Force):** If **5 consecutive failed attempts** are recorded (either via invalid JWT or incorrect override PIN), the controller triggers a local physical buzzer alarm, logs the event, and enters **15-minute lockdown**. During lockdown, unlock endpoints reject all inputs automatically.
* **Low Battery Fail-Safe:** If battery drops below 5%, the hardware is configured to unlock automatically by default (Fail-Open) to prevent occupant entrapment.`
    },
    "industrial-plc": {
        name: "PLC-IND-400 (Modbus Gateway)",
        files: {
            "plc_config.json": `{
  "deviceId": "PLC-IND-400",
  "firmware_version": "v3.0.12",
  "protocols": ["Modbus-TCP", "HTTP"],
  "status": "operational",
  "telemetryIntervalMs": 1000,
  "analog_inputs": 4,
  "relay_outputs": 2
}`,
            "modbus_notes.txt": `Integration details for PLC-IND-400:
- Raw Modbus coils/registers are exposed via JSON interface.
- /api/v1/coils retrieves and sets digital states. Setting coils requires query parameter ?action=write.
- WARNING: Reading input registers (/api/v1/registers) returns raw 16-bit values. Scaled readings require applying a division factor of 10.0 (e.g. 235 read is 23.5°C).
- No security on Local LAN. To authenticate remote operations, use header X-PLC-Auth-Token.`,
            "gateway_router.py": `@app.route('/api/v1/coils', methods=['GET', 'POST'])
def manage_coils():
    # GET: returns [{"coil_0": true}, {"coil_1": false}]
    # POST: writing to coils. Expects JSON body: {"coil": 0, "state": true}
    # Requires token authentication for writing
    if request.method == 'POST':
        if request.headers.get('X-PLC-Auth-Token') != CONFIG['AUTH_TOKEN']:
            return {"error": "unauthorized"}, 401
        return write_modbus_coil(request.json)
    return read_modbus_coils()

@app.route('/api/v1/registers', methods=['GET'])
def read_registers():
    # GET: Returns input registers (16-bit)
    # Format: {"reg_0": 1024, "reg_1": 235}
    return read_modbus_registers()`
        },
        markdown: `# PLC-IND-400 API Documentation
**Firmware Version:** v3.0.12 | **Status:** operational | **Protocols:** Modbus-TCP, HTTP

## 1. Overview
The PLC-IND-400 is an industrial-grade Modbus-TCP to HTTP gateway converter. It maps digital coils and physical input registers directly to clean JSON-based endpoints. This allows supervisory networks to monitor relays and sensors without raw Modbus stack implementations.

## 2. Authentication
* **Local LAN Operations:** Read actions are completely unauthenticated to minimize command delays.
* **Write Operations:** Altering relay output states (writing to coils) requires a token in the headers:
  * **Header:** \`X-PLC-Auth-Token\`

## 3. Endpoints

### GET /api/v1/coils
* **Description:** Retrieves the digital boolean state of output relays 0 and 1.
* **Rate Limits / Constraints:** None.
* **Request Structure:**
  * No parameters required.
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  [
    {"coil_0": true},
    {"coil_1": false}
  ]
  \`\`\`

### POST /api/v1/coils
* **Description:** Writes a new state to toggle the physical output relay switches.
* **Rate Limits / Constraints:** Requires valid remote authentication.
* **Request Structure:**
  * **Headers:**
    | Header | Type | Description |
    | :--- | :--- | :--- |
    | \`X-PLC-Auth-Token\` | String | Secret authentication token configured on the PLC |
  * **JSON Body:**
    \`\`\`json
    {
      "coil": 0,
      "state": true
    }
    \`\`\`
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  {
    "status": "write_success",
    "coil": 0,
    "state": true
  }
  \`\`\`
  * **Status 401 Unauthorized**
  \`\`\`json
  {
    "error": "unauthorized"
  }
  \`\`\`

### GET /api/v1/registers
* **Description:** Reads the values of the 4 analog input registers from connected analog lines.
* **Rate Limits / Constraints:** Client requests should match the 1000ms hardware register refresh interval to avoid polling stale data.
* **Request Structure:**
  * No authorization headers required.
* **Response Structure:**
  * **Status 200 OK**
  \`\`\`json
  {
    "reg_0": 1024,
    "reg_1": 235
  }
  \`\`\`

## 4. Error Codes & Edge Cases
* **Register Scale Factor:** Values inside \`/api/v1/registers\` are returned as raw 16-bit register words. Clients must divide values by **10.0** to obtain float measurements (e.g. value \`235\` inside \`reg_1\` converts to **23.5** units).
* **Bus Collisions:** Flooding HTTP requests faster than 10Hz can block local Modbus RS485 loops, triggering temporary read errors. Use a 1000ms polling cycle.`
    }
};

// --- 2. APPLICATION STATE ---
let state = {
    mode: "demo", // "demo" or "live"
    activeExample: "env-sensor",
    files: {}, // Current active workspace files
    activeFile: "", // Name of currently selected file in editor
    geminiKey: "",
    generatedMarkdown: ""
};

// --- 3. DOM ELEMENTS ---
const DOM = {
    modeSwitch: document.getElementById("mode-switch"),
    labelDemo: document.getElementById("label-demo"),
    labelLive: document.getElementById("label-live"),
    apiKeySection: document.getElementById("api-key-section"),
    apiKeyInput: document.getElementById("api-key-input"),
    toggleKeyVisibility: document.getElementById("toggle-key-visibility"),
    saveKeyBtn: document.getElementById("save-key-btn"),
    exampleSelect: document.getElementById("example-select"),
    editorTabs: document.getElementById("editor-tabs"),
    activeFilename: document.getElementById("active-filename"),
    deleteFileBtn: document.getElementById("delete-file-btn"),
    addFileBtn: document.getElementById("add-file-btn"),
    editorLineNumbers: document.getElementById("editor-line-numbers"),
    editorTextarea: document.getElementById("editor-textarea"),
    resetWorkspaceBtn: document.getElementById("reset-workspace-btn"),
    generateBtn: document.getElementById("generate-btn"),
    outputActions: document.getElementById("output-actions"),
    copyMarkdownBtn: document.getElementById("copy-markdown-btn"),
    downloadMarkdownBtn: document.getElementById("download-markdown-btn"),
    printBtn: document.getElementById("print-btn"),
    tabPreviewBtn: document.getElementById("tab-preview-btn"),
    tabRawBtn: document.getElementById("tab-raw-btn"),
    stateIdle: document.getElementById("state-idle"),
    stateLoading: document.getElementById("state-loading"),
    stateResult: document.getElementById("state-result"),
    generationProgress: document.getElementById("generation-progress"),
    loadingStatus: document.getElementById("loading-status"),
    loadingTerminalLogs: document.getElementById("loading-terminal-logs"),
    markdownRenderedContent: document.getElementById("markdown-rendered-content"),
    rawMarkdownContent: document.getElementById("raw-markdown-content"),
    outputPreview: document.getElementById("output-preview"),
    outputRaw: document.getElementById("output-raw")
};

// --- 4. INITIALIZE APP ---
function init() {
    // Load Gemini key from local storage if existing
    const savedKey = localStorage.getItem("iot_docgen_gemini_key");
    if (savedKey) {
        state.geminiKey = savedKey;
        DOM.apiKeyInput.value = savedKey;
    }

    // Set initial toggle switch states
    DOM.modeSwitch.checked = (state.mode === "live");
    
    // Load Initial Mock Data Workspace
    loadExampleWorkspace(state.activeExample);

    // Event Bindings
    DOM.modeSwitch.addEventListener("change", handleModeToggle);
    DOM.toggleKeyVisibility.addEventListener("click", handleToggleKeyVisibility);
    DOM.saveKeyBtn.addEventListener("click", handleSaveKey);
    DOM.exampleSelect.addEventListener("change", handleExampleChange);
    DOM.addFileBtn.addEventListener("click", handleCreateNewFile);
    DOM.deleteFileBtn.addEventListener("click", handleDeleteActiveFile);
    DOM.activeFilename.addEventListener("change", handleRenameActiveFile);
    DOM.editorTextarea.addEventListener("input", handleEditorInput);
    DOM.editorTextarea.addEventListener("scroll", syncLineScroll);
    DOM.resetWorkspaceBtn.addEventListener("click", handleResetWorkspace);
    DOM.generateBtn.addEventListener("click", handleGenerateDocs);
    
    // Output Tab Bindings
    DOM.tabPreviewBtn.addEventListener("click", () => switchOutputTab("preview"));
    DOM.tabRawBtn.addEventListener("click", () => switchOutputTab("raw"));
    
    // Action Buttons Bindings
    DOM.copyMarkdownBtn.addEventListener("click", copyMarkdownToClipboard);
    DOM.downloadMarkdownBtn.addEventListener("click", downloadMarkdownFile);
    DOM.printBtn.addEventListener("click", () => window.print());

    // Initialize line numbers count
    updateLineNumbers();
}

// --- 5. WORKSPACE LOADER AND RENDERERS ---

function loadExampleWorkspace(exampleId) {
    state.activeExample = exampleId;
    // Clone files object from examples source
    state.files = JSON.parse(JSON.stringify(IoT_EXAMPLES[exampleId].files));
    // Select the first file as active file
    const fileNames = Object.keys(state.files);
    state.activeFile = fileNames[0] || "";
    
    renderEditorTabs();
    loadActiveFileIntoTextarea();
}

function renderEditorTabs() {
    // Keep the "Add File" button in place, replace all previous file tab nodes
    const tabButtons = DOM.editorTabs.querySelectorAll(".file-tab");
    tabButtons.forEach(btn => btn.remove());

    Object.keys(state.files).forEach(fileName => {
        const fileTab = document.createElement("button");
        fileTab.className = `file-tab ${fileName === state.activeFile ? 'active' : ''}`;
        fileTab.setAttribute("role", "tab");
        
        // Pick class icon based on extension
        let fileIcon = "fa-regular fa-file-lines";
        if (fileName.endsWith(".json")) fileIcon = "fa-regular fa-file-code";
        if (fileName.endsWith(".py")) fileIcon = "fa-brands fa-python";

        fileTab.innerHTML = `
            <i class="file-icon ${fileIcon}"></i>
            <span>${fileName}</span>
            <span class="close-tab-icon" title="Close File"><i class="fa-solid fa-xmark"></i></span>
        `;

        // Tab click select
        fileTab.addEventListener("click", (e) => {
            if (e.target.closest(".close-tab-icon")) {
                e.stopPropagation();
                closeFile(fileName);
            } else {
                switchActiveFile(fileName);
            }
        });

        // Insert before the add file button
        DOM.editorTabs.insertBefore(fileTab, DOM.addFileBtn);
    });
}

function loadActiveFileIntoTextarea() {
    if (state.activeFile && state.files[state.activeFile] !== undefined) {
        DOM.editorTextarea.value = state.files[state.activeFile];
        DOM.activeFilename.value = state.activeFile;
        DOM.activeFilename.disabled = false;
        DOM.deleteFileBtn.style.display = "block";
        DOM.editorTextarea.disabled = false;
    } else {
        DOM.editorTextarea.value = "";
        DOM.activeFilename.value = "No files open";
        DOM.activeFilename.disabled = true;
        DOM.deleteFileBtn.style.display = "none";
        DOM.editorTextarea.disabled = true;
    }
    updateLineNumbers();
    syncLineScroll();
}

function switchActiveFile(fileName) {
    state.activeFile = fileName;
    
    // Update tab classes
    const tabs = DOM.editorTabs.querySelectorAll(".file-tab");
    tabs.forEach(tab => {
        const tabName = tab.querySelector("span").innerText.trim();
        if (tabName === fileName) {
            tab.classList.add("active");
        } else {
            tab.classList.remove("active");
        }
    });

    loadActiveFileIntoTextarea();
}

// --- 6. FILE CRUD OPERATIONS ---

function handleCreateNewFile() {
    // Generate a unique file name
    let count = 1;
    let newName = `untitled_${count}.txt`;
    while (state.files[newName] !== undefined) {
        count++;
        newName = `untitled_${count}.txt`;
    }

    state.files[newName] = "";
    state.activeFile = newName;
    renderEditorTabs();
    loadActiveFileIntoTextarea();
    DOM.activeFilename.focus();
    DOM.activeFilename.select();
}

function handleDeleteActiveFile() {
    if (!state.activeFile) return;
    
    if (confirm(`Are you sure you want to delete ${state.activeFile}?`)) {
        delete state.files[state.activeFile];
        
        // Select another file if any remain
        const fileNames = Object.keys(state.files);
        state.activeFile = fileNames[0] || "";
        
        renderEditorTabs();
        loadActiveFileIntoTextarea();
    }
}

function closeFile(fileName) {
    // For this client demo, closing is equivalent to deleting from active memory workspace
    if (confirm(`Close and discard ${fileName}?`)) {
        delete state.files[fileName];
        if (state.activeFile === fileName) {
            const fileNames = Object.keys(state.files);
            state.activeFile = fileNames[0] || "";
        }
        renderEditorTabs();
        loadActiveFileIntoTextarea();
    }
}

function handleRenameActiveFile() {
    const oldName = state.activeFile;
    let newName = DOM.activeFilename.value.trim();

    if (!newName) {
        DOM.activeFilename.value = oldName;
        return;
    }

    if (newName === oldName) return;

    if (state.files[newName] !== undefined) {
        alert("A file with this name already exists.");
        DOM.activeFilename.value = oldName;
        return;
    }

    // Rename object property key
    state.files[newName] = state.files[oldName];
    delete state.files[oldName];
    state.activeFile = newName;

    renderEditorTabs();
    loadActiveFileIntoTextarea();
}

function handleEditorInput() {
    if (state.activeFile) {
        state.files[state.activeFile] = DOM.editorTextarea.value;
        updateLineNumbers();
    }
}

// Line Numbers Gutter management
function updateLineNumbers() {
    const lines = DOM.editorTextarea.value.split('\n');
    const lineCount = Math.max(lines.length, 1);
    
    let lineHTML = '';
    for (let i = 1; i <= lineCount; i++) {
        lineHTML += `<div>${i}</div>`;
    }
    DOM.editorLineNumbers.innerHTML = lineHTML;
}

function syncLineScroll() {
    DOM.editorLineNumbers.scrollTop = DOM.editorTextarea.scrollTop;
}

function handleResetWorkspace() {
    if (confirm("Reset current workspace? This will revert all modifications back to the default files.")) {
        loadExampleWorkspace(state.activeExample);
    }
}

// --- 7. WORKSPACE ACTIONS AND CONFIG ---

function handleModeToggle() {
    state.mode = DOM.modeSwitch.checked ? "live" : "demo";
    
    if (state.mode === "live") {
        DOM.labelLive.classList.add("active");
        DOM.labelDemo.classList.remove("active");
        DOM.apiKeySection.classList.remove("hidden");
        
        // Update the idle hint card
        DOM.stateIdle.querySelector(".mode-hint-card").innerHTML = `
            <span class="badge" style="color:var(--accent-indigo);"><i class="fa-solid fa-bolt"></i> Live API Mode</span>
            <p>Will compile prompt and query Gemini live using your API key. Stored securely client-side.</p>
        `;
    } else {
        DOM.labelDemo.classList.add("active");
        DOM.labelLive.classList.remove("active");
        DOM.apiKeySection.classList.add("hidden");
        
        DOM.stateIdle.querySelector(".mode-hint-card").innerHTML = `
            <span class="badge"><i class="fa-solid fa-info-circle"></i> Running in Demo Mode</span>
            <p>Runs client-side instantly for free using pre-compiled expert LLM responses, displaying realistic progression speeds.</p>
        `;
    }
}

function handleToggleKeyVisibility() {
    const type = DOM.apiKeyInput.type === "password" ? "text" : "password";
    DOM.apiKeyInput.type = type;
    const eyeIcon = DOM.toggleKeyVisibility.querySelector("i");
    if (type === "password") {
        eyeIcon.className = "fa-regular fa-eye";
    } else {
        eyeIcon.className = "fa-regular fa-eye-slash";
    }
}

function handleSaveKey() {
    const key = DOM.apiKeyInput.value.trim();
    if (!key) {
        alert("Please enter a valid Gemini API Key.");
        return;
    }
    state.geminiKey = key;
    localStorage.setItem("iot_docgen_gemini_key", key);
    
    // Add success feedback animation on save button
    const originalText = DOM.saveKeyBtn.innerText;
    DOM.saveKeyBtn.innerText = "Key Saved!";
    DOM.saveKeyBtn.style.background = "hsl(145, 75%, 45%)";
    DOM.saveKeyBtn.style.color = "white";
    
    setTimeout(() => {
        DOM.saveKeyBtn.innerText = originalText;
        DOM.saveKeyBtn.style.background = "";
        DOM.saveKeyBtn.style.color = "";
    }, 2000);
}

function handleExampleChange() {
    const selected = DOM.exampleSelect.value;
    loadExampleWorkspace(selected);
}

// --- 8. PROMPT CONSTRUCTOR ENGINE ---

function buildPromptString(filesDict) {
    // Formats context string similar to the python implementation_plan
    let rawContextString = "";
    Object.entries(filesDict).forEach(([filename, content]) => {
        rawContextString += `--- BEGIN FILE: ${filename} ---\n${content}\n--- END FILE: ${filename} ---\n\n`;
    });
    
    // Returns full Prompt matching prompt_builder.py structure
    return `You are an Expert Technical Writer and Senior API Architect specializing in IoT device documentation. 

Your task is to analyze a messy collection of raw IoT device data (JSON configurations, code snippets, and developer notes) and synthesize it into a beautifully structured, OpenAPI/Swagger-style Markdown documentation file.

### INFERENCE GUIDELINES (CRITICAL):
1. Synthesize and Cross-Reference: You must connect the dots between the different files. For example, if a code snippet defines an endpoint, and a separate text note mentions a rate limit or authentication header for that endpoint, you must combine them in the final documentation.
2. Handling Edge Cases: Document any known bugs, calibration issues, or delays mentioned in the notes (e.g., sensor anomalies, reboot times) clearly under the relevant endpoints.
3. Missing Data: If a specific detail (like a response payload structure) is missing, infer it logically from the code if possible, otherwise state "Not explicitly defined". Do NOT hallucinate entirely new endpoints or parameters.

### REQUIRED MARKDOWN STRUCTURE:
Your output must strictly follow this structure:

# [Device ID] API Documentation
**Firmware Version:** [Version] | **Status:** [Status] | **Protocols:** [List]

## 1. Overview
[A brief synthesized description of the device and its capabilities based on the inputs.]

## 2. Authentication
[Detail any headers, API keys, or security mechanisms required to interact with the device.]

## 3. Endpoints
[For each endpoint found in the context, create a sub-section using the format below]
### \`[HTTP METHOD]\` \`[Endpoint Path]\`
* **Description:** [What it does]
* **Rate Limits / Constraints:** [Any limits mentioned]
* **Request Structure:**
  * [Table or list of parameters/headers]
* **Response Structure:**
  * [Table or JSON block of expected outputs]

## 4. Error Codes & Edge Cases
[A unified table or list of potential errors, hardware constraints, and how to handle them (e.g., unauthorized errors, calibration values).]

### OUTPUT CONSTRAINTS:
- DO NOT output any conversational filler (e.g., "Here is the documentation", "Let me know if you need changes", etc.).
- Output ONLY the raw Markdown content.
- Ensure all tables are properly formatted in Markdown.

### RAW DEVICE CONTEXT:
The following block contains the raw files extracted from the device's repository:

${rawContextString}`;
}

// --- 9. GENERATION PIPELINE CONTROLLER ---

function handleGenerateDocs() {
    // Show spinner inside button
    DOM.generateBtn.disabled = true;
    DOM.generateBtn.querySelector(".btn-text").classList.add("hidden");
    DOM.generateBtn.querySelector(".btn-loader").classList.remove("hidden");
    
    // Toggle screens
    DOM.stateIdle.classList.add("hidden");
    DOM.stateResult.classList.add("hidden");
    DOM.outputActions.classList.add("hidden");
    DOM.stateLoading.classList.remove("hidden");

    if (state.mode === "live") {
        runLiveGeneration();
    } else {
        runDemoGeneration();
    }
}

// MOCK SIMULATED GENERATION LOGS
const MOCK_LOGS = [
    { progress: 10, status: "Normalizing raw repository context...", delay: 600, level: "info" },
    { progress: 25, status: "Analysing file types and signatures...", delay: 500, level: "info" },
    { progress: 45, status: "Injecting variables into System Prompt template...", delay: 700, level: "info" },
    { progress: 60, status: "Building prompt payload context...", delay: 600, level: "info" },
    { progress: 75, status: "Dispatching request to Gemini API (gemini-2.0-flash)...", delay: 1000, level: "warning" },
    { progress: 90, status: "Synthesized markdown data received.", delay: 800, level: "success" },
    { progress: 100, status: "Parsing document structure and rendering HTML...", delay: 400, level: "info" }
];

function runDemoGeneration() {
    // Reset loader status
    DOM.generationProgress.style.width = "0%";
    DOM.loadingTerminalLogs.innerHTML = "";
    
    let currentLogIndex = 0;
    
    function logStep() {
        if (currentLogIndex >= MOCK_LOGS.length) {
            // Loading complete! Display generated output
            finalizeGeneration(IoT_EXAMPLES[state.activeExample].markdown);
            return;
        }
        
        const log = MOCK_LOGS[currentLogIndex];
        
        // Update UI status
        DOM.generationProgress.style.width = `${log.progress}%`;
        DOM.loadingStatus.innerText = `Step ${currentLogIndex + 1}: ${log.status}`;
        
        // Append log line to terminal simulation
        const timestamp = new Date().toLocaleTimeString().split(" ")[0];
        const logLine = document.createElement("div");
        logLine.className = `terminal-log-line ${log.level}`;
        logLine.innerHTML = `[${timestamp}] <span class="log-level">[${log.level.toUpperCase()}]</span> ${log.status}`;
        DOM.loadingTerminalLogs.appendChild(logLine);
        DOM.loadingTerminalLogs.scrollTop = DOM.loadingTerminalLogs.scrollHeight;
        
        currentLogIndex++;
        setTimeout(logStep, log.delay);
    }
    
    logStep();
}

async function runLiveGeneration() {
    DOM.generationProgress.style.width = "0%";
    DOM.loadingTerminalLogs.innerHTML = "";
    
    const writeLog = (text, level = "info") => {
        const timestamp = new Date().toLocaleTimeString().split(" ")[0];
        const logLine = document.createElement("div");
        logLine.className = `terminal-log-line ${level}`;
        logLine.innerHTML = `[${timestamp}] <span class="log-level">[${level.toUpperCase()}]</span> ${text}`;
        DOM.loadingTerminalLogs.appendChild(logLine);
        DOM.loadingTerminalLogs.scrollTop = DOM.loadingTerminalLogs.scrollHeight;
    };

    if (!state.geminiKey) {
        writeLog("ERROR: Gemini API Key is missing! Toggle Live API configuration banner to save key.", "error");
        DOM.loadingStatus.innerText = "Error: Key Missing";
        resetGenerateButton();
        return;
    }

    try {
        writeLog("Step 1: Constructing unified code-context environment...");
        DOM.generationProgress.style.width = "20%";
        DOM.loadingStatus.innerText = "Constructing context...";
        
        // Build the actual prompt string from files
        const prompt = buildPromptString(state.files);
        await sleep(600);
        
        writeLog("Step 2: Synthesizing Prompt architecture templates...");
        DOM.generationProgress.style.width = "40%";
        DOM.loadingStatus.innerText = "Building System prompt...";
        await sleep(500);

        writeLog("Step 3: Dispatching request query to Google Gemini API (gemini-2.0-flash)...", "warning");
        DOM.generationProgress.style.width = "60%";
        DOM.loadingStatus.innerText = "Querying model...";
        
        // Call the real Google Gemini API
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${state.geminiKey}`;
        
        const payload = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.1
            }
        };

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errData = await response.json();
            const errMessage = errData.error?.message || "HTTP request error";
            throw new Error(`API Error (${response.status}): ${errMessage}`);
        }

        DOM.generationProgress.style.width = "85%";
        writeLog("Step 4: Parsing LLM response data payload...", "success");
        DOM.loadingStatus.innerText = "Receiving specification outputs...";
        
        const resultData = await response.json();
        const generatedText = resultData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!generatedText) {
            throw new Error("No text returned in Gemini response candidates.");
        }
        
        writeLog("Step 5: Formatting and parsing markdown outputs...", "info");
        DOM.generationProgress.style.width = "100%";
        await sleep(400);

        finalizeGeneration(generatedText);
        
    } catch (err) {
        writeLog(`CRITICAL FAILURE: ${err.message}`, "error");
        DOM.loadingStatus.innerText = "API Call Failed";
        resetGenerateButton();
        
        // Show diagnostic advice in case of CORS or key errors
        if (err.message.includes("400")) {
            writeLog("Hint: Double-check your API Key formatting. It should begin with 'AIzaSy'.", "info");
        } else if (err.message.includes("429")) {
            writeLog("Hint: Resource exhausted. You might be exceeding your Gemini API free-tier rates.", "warning");
        } else if (err.message.includes("Failed to fetch")) {
            writeLog("Hint: Local network issue or CORS restriction. Verify internet connectivity.", "info");
        }
    }
}

function finalizeGeneration(markdownContent) {
    state.generatedMarkdown = markdownContent;
    
    // Render Markdown using Marked.js library
    let htmlContent = "";
    if (window.marked) {
        htmlContent = marked.parse(markdownContent);
    } else {
        htmlContent = `<pre>${markdownContent}</pre>`;
    }
    
    // Post-process HTML to color HTTP endpoints beautifully
    // Regex matches headings like: <h3><code>GET</code> <code>/path</code></h3> or <h3>GET /path</h3>
    // We replace it with a styled endpoint block header
    htmlContent = htmlContent.replace(/<h3>(<code>)?(GET|POST|PUT|DELETE|PATCH|OPTIONS)(<\/code>)?\s+(<code>)?([^<]+)(<\/code>)?<\/h3>/g, (match, c1, method, c2, c3, path, c4) => {
        const cleanPath = path.replace(/<\/?code>/g, '').trim();
        return `
            <div class="endpoint-block-header">
                <h3>
                    <span class="http-badge ${method.toLowerCase()}">${method}</span>
                    <span class="endpoint-title">${cleanPath}</span>
                </h3>
            </div>
        `;
    });

    DOM.markdownRenderedContent.innerHTML = htmlContent;
    DOM.rawMarkdownContent.innerText = markdownContent;
    
    // Apply syntax highlighting
    if (window.Prism) {
        Prism.highlightElement(DOM.rawMarkdownContent);
        // Highlight nested code snippets inside preview if any
        DOM.markdownRenderedContent.querySelectorAll("pre code").forEach(el => {
            Prism.highlightElement(el);
        });
    }

    // Switch view to results
    DOM.stateLoading.classList.add("hidden");
    DOM.stateResult.classList.remove("hidden");
    DOM.outputActions.classList.remove("hidden");
    
    // Set preview tab as default active output tab
    switchOutputTab("preview");
    
    resetGenerateButton();
}

function resetGenerateButton() {
    DOM.generateBtn.disabled = false;
    DOM.generateBtn.querySelector(".btn-text").classList.remove("hidden");
    DOM.generateBtn.querySelector(".btn-loader").classList.add("hidden");
}

function switchOutputTab(tabId) {
    if (tabId === "preview") {
        DOM.tabPreviewBtn.classList.add("active");
        DOM.tabRawBtn.classList.remove("active");
        DOM.outputPreview.classList.add("active");
        DOM.outputPreview.classList.remove("hidden");
        DOM.outputRaw.classList.add("hidden");
        DOM.outputRaw.classList.remove("active");
    } else {
        DOM.tabRawBtn.classList.add("active");
        DOM.tabPreviewBtn.classList.remove("active");
        DOM.outputRaw.classList.add("active");
        DOM.outputRaw.classList.remove("hidden");
        DOM.outputPreview.classList.add("hidden");
        DOM.outputPreview.classList.remove("active");
    }
}

// --- 10. HELPER FUNCTIONS ---

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function copyMarkdownToClipboard() {
    if (!state.generatedMarkdown) return;
    
    navigator.clipboard.writeText(state.generatedMarkdown).then(() => {
        // Success indicator
        const originalText = DOM.copyMarkdownBtn.innerHTML;
        DOM.copyMarkdownBtn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        
        setTimeout(() => {
            DOM.copyMarkdownBtn.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error("Clipboard copy failed: ", err);
    });
}

function downloadMarkdownFile() {
    if (!state.generatedMarkdown) return;
    
    const element = document.createElement("a");
    const file = new Blob([state.generatedMarkdown], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    
    // Choose appropriate filename
    const devIdMatch = state.generatedMarkdown.match(/#\s+([A-Za-z0-9_-]+)\s+API/);
    const fileName = devIdMatch ? `${devIdMatch[1].trim()}_api.md` : 'device_api.md';
    
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Self start on DOM Content Loaded
document.addEventListener("DOMContentLoaded", init);
