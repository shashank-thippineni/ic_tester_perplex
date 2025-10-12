//===========================================
// PIN MAPPING & GLOBAL STATE
//===========================================
const PIN_MAP = {
    "PA0": 0x00, "PA1": 0x01, "PA2": 0x02, "PA3": 0x03,
    "PA4": 0x04, "PA5": 0x05, "PA6": 0x06, "PA7": 0x07,
    "PB0": 0x10, "PB1": 0x11, "PB10": 0x1A, "PB11": 0x1B
};

const PIN_NAMES = Object.keys(PIN_MAP);

let serialPort = null;
let gates = [];
let muxes = [];
let flipflops = [];
let isConnected = false;
let currentICType = '';

//===========================================
// IC TYPE INTERFACE SWITCHING
//===========================================
function showICInterface() {
    const icType = document.getElementById('icTypeSelector').value;
    currentICType = icType;
    
    document.querySelectorAll('.ic-interface').forEach(interface => {
        interface.style.display = 'none';
    });
    
    if (icType) {
        const selectedInterface = document.getElementById(icType + '-interface');
        if (selectedInterface) {
            selectedInterface.style.display = 'block';
            
            switch(icType) {
                case 'logic-gate':
                    break;
                case 'multiplexer':
                    updateMuxCount();
                    break;
                case 'counter':
                    updateCounterConfig();
                    break;
                case 'flipflop':
                    updateFFCount();
                    break;
            }
        }
    }
}

//===========================================
// CONNECTION HANDLING
//===========================================
document.getElementById('connectBtn').addEventListener('click', async () => {
    if (isConnected) {
        disconnect();
        return;
    }
    
    await connectSerial();
});

async function connectSerial() {
    if (!('serial' in navigator)) {
        alert('⚠️ Web Serial API not supported!\n\nPlease use:\n• Chrome 89+ or Edge 89+\n• Desktop/Laptop (not mobile)');
        return;
    }
    
    try {
        const port = await navigator.serial.requestPort({
            filters: [
                { usbVendorId: 0x0483 },
                { usbVendorId: 0x0483, usbProductId: 0x5740 }
            ]
        });
        
        await port.open({ baudRate: 115200 });
        serialPort = port;
        
        isConnected = true;
        updateConnectionStatus(true);
        
        console.log('✅ STM32 connected');
    } catch (error) {
        if (error.name === 'NotFoundError') {
            alert('❌ No STM32 found!\n\nPlease:\n1. Connect STM32 via USB\n2. Install drivers\n3. Try again');
        } else {
            alert('❌ Connection failed: ' + error.message);
        }
        console.error(error);
    }
}

function disconnect() {
    if (serialPort) {
        serialPort.close();
        serialPort = null;
    }
    
    isConnected = false;
    updateConnectionStatus(false);
}

function updateConnectionStatus(connected) {
    const status = document.getElementById('status');
    const btn = document.getElementById('connectBtn');
    
    if (connected) {
        status.textContent = 'Connected';
        status.className = 'status connected';
        btn.textContent = 'Disconnect';
        btn.className = 'btn-danger';
    } else {
        status.textContent = 'Disconnected';
        status.className = 'status disconnected';
        btn.textContent = 'Connect to STM32';
        btn.className = 'btn-primary';
    }
}

//===========================================
// LOGIC GATES
//===========================================
function openGateDialog() {
    document.getElementById('gateModal').classList.add('active');
    updatePinSelectors();
}

function closeGateDialog() {
    document.getElementById('gateModal').classList.remove('active');
}

function updatePinSelectors() {
    const numInputs = parseInt(document.getElementById('numInputs').value);
    const numOutputs = parseInt(document.getElementById('numOutputs').value);
    
    const inputPins = document.getElementById('inputPins');
    inputPins.innerHTML = '';
    for (let i = 0; i < numInputs; i++) {
        const select = document.createElement('select');
        select.className = 'input-pin-select';
        PIN_NAMES.forEach((pin, idx) => {
            const option = document.createElement('option');
            option.value = pin;
            option.textContent = pin;
            if (idx === i) option.selected = true;
            select.appendChild(option);
        });
        inputPins.appendChild(select);
    }
    
    const outputPins = document.getElementById('outputPins');
    outputPins.innerHTML = '';
    for (let i = 0; i < numOutputs; i++) {
        const select = document.createElement('select');
        select.className = 'output-pin-select';
        PIN_NAMES.forEach((pin, idx) => {
            const option = document.createElement('option');
            option.value = pin;
            option.textContent = pin;
            if (idx === numInputs + i) option.selected = true;
            select.appendChild(option);
        });
        outputPins.appendChild(select);
    }
    
    updateTruthTable();
}

function updateTruthTable() {
    const numInputs = parseInt(document.getElementById('numInputs').value);
    const combinations = Math.pow(2, numInputs);
    
    const truthTable = document.getElementById('truthTable');
    truthTable.innerHTML = '';
    
    const header = document.createElement('div');
    header.style.marginBottom = '15px';
    header.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">Truth Table:</div>
        <div style="font-size: 12px; color: #666;">
            For each INPUT combination, enter the expected OUTPUT (0 or 1)
        </div>
    `;
    truthTable.appendChild(header);
    
    for (let i = 0; i < combinations; i++) {
        const binary = i.toString(2).padStart(numInputs, '0');
        
        const row = document.createElement('div');
        row.className = 'truth-row';
        
        const label = document.createElement('span');
        label.textContent = binary.split('').join(' ');
        label.style.minWidth = '100px';
        label.style.fontFamily = 'monospace';
        label.style.fontSize = '16px';
        label.style.fontWeight = '600';
        
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '1';
        input.value = '0';
        input.className = 'truth-output';
        
        row.appendChild(label);
        row.appendChild(input);
        truthTable.appendChild(row);
    }
}

function saveGate() {
    const numInputs = parseInt(document.getElementById('numInputs').value);
    const numOutputs = parseInt(document.getElementById('numOutputs').value);
    
    const inputPins = Array.from(document.querySelectorAll('.input-pin-select'))
        .map(select => select.value);
    
    const outputPins = Array.from(document.querySelectorAll('.output-pin-select'))
        .map(select => select.value);
    
    const truthTable = Array.from(document.querySelectorAll('.truth-output'))
        .map(input => [parseInt(input.value)]);
    
    const gate = {
        num_inputs: numInputs,
        num_outputs: numOutputs,
        input_pins: inputPins,
        output_pins: outputPins,
        truth_table: truthTable
    };
    
    gates.push(gate);
    updateGatesList();
    closeGateDialog();
}

function updateGatesList() {
    const list = document.getElementById('gateList');
    
    if (gates.length === 0) {
        list.innerHTML = '<p style="color: #999;">No gates configured yet</p>';
        return;
    }
    
    list.innerHTML = '';
    gates.forEach((gate, index) => {
        const item = document.createElement('div');
        item.className = 'gate-item';
        
        const info = document.createElement('span');
        info.textContent = `Gate ${index + 1}: ${gate.num_inputs}in, ${gate.num_outputs}out - In:${gate.input_pins.join(',')} Out:${gate.output_pins.join(',')}`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'btn-danger';
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.onclick = () => {
            gates.splice(index, 1);
            updateGatesList();
        };
        
        item.appendChild(info);
        item.appendChild(deleteBtn);
        list.appendChild(item);
    });
}

function clearGates() {
    if (confirm('Clear all gates?')) {
        gates = [];
        updateGatesList();
    }
}

function jsonToBinary() {
    const packet = [];
    packet.push(0xAA);
    packet.push(gates.length);
    
    gates.forEach(gate => {
        packet.push(gate.num_inputs);
        packet.push(gate.num_outputs);
        
        gate.input_pins.forEach(pin => packet.push(PIN_MAP[pin]));
        gate.output_pins.forEach(pin => packet.push(PIN_MAP[pin]));
        
        let truthByte = 0;
        gate.truth_table.forEach((output, i) => {
            if (output[0] === 1) {
                truthByte |= (1 << i);
            }
        });
        packet.push(truthByte);
    });
    
    packet.push(0xFF);
    return new Uint8Array(packet);
}

async function testIC() {
    if (!isConnected) {
        alert('⚠️ Not connected to STM32!');
        return;
    }
    
    if (gates.length === 0) {
        alert('⚠️ No gates configured!');
        return;
    }
    
    const packet = jsonToBinary();
    const results = document.getElementById('results');
    
    const hexStr = Array.from(packet).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    results.textContent = '🧪 Testing IC...\n';
    results.textContent += `📤 Sending ${packet.length} bytes:\n`;
    results.textContent += `HEX: ${hexStr}\n\n`;
    
    try {
        const writer = serialPort.writable.getWriter();
        await writer.write(packet);
        writer.releaseLock();
        
        results.textContent += '✅ Packet sent! Waiting for response...\n';
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const reader = serialPort.readable.getReader();
        const { value, done } = await reader.read();
        reader.releaseLock();
        
        if (value && value.length > 0) {
            handleResponse(value);
        } else {
            results.textContent += '\n❌ No response from STM32\n';
        }
        
    } catch (error) {
        results.textContent += '\n❌ Error: ' + error.message;
        console.error(error);
    }
}

function handleResponse(response) {
    const results = document.getElementById('results');
    let output = results.textContent;
    
    output += '\n✅ Response received:\n';
    output += 'HEX: ' + Array.from(response).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ') + '\n\n';
    
    // Find the ACTUAL binary packet (0x55 followed by count, then 0xFF at correct position)
    let binaryStart = -1;
    let numGates = 0;
    
    for (let i = 0; i < response.length - 3; i++) {
        if (response[i] === 0x55) {
            // Check if this looks like a valid packet
            const potentialCount = response[i + 1];
            
            // Valid gate count should be 1-8
            if (potentialCount >= 1 && potentialCount <= 8) {
                // Check if 0xFF is at the expected position
                const expectedEnd = i + 2 + potentialCount;
                if (expectedEnd < response.length && response[expectedEnd] === 0xFF) {
                    binaryStart = i;
                    numGates = potentialCount;
                    break;
                }
            }
        }
    }
    
    if (binaryStart === -1) {
        output += '❌ No valid binary response packet found\n';
        output += 'Debug: ' + new TextDecoder().decode(response);
        results.textContent = output;
        return;
    }
    
    output += '📊 Test Results:\n';
    output += '═══════════════════════════════════════\n';
    output += `Tested ${numGates} gate(s):\n\n`;
    
    let allPass = true;
    for (let i = 0; i < numGates; i++) {
        const passed = response[binaryStart + 2 + i] === 0x01;
        output += `  Gate ${i + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}\n`;
        if (!passed) allPass = false;
    }
    
    output += '\n═══════════════════════════════════════\n';
    output += `Overall: ${allPass ? '✅ ALL GATES PASSED! 🎉' : '❌ SOME GATES FAILED'}\n`;
    output += '═══════════════════════════════════════';
    
    results.textContent = output;
}


function viewBinary() {
    if (gates.length === 0) {
        alert('⚠️ No gates configured!');
        return;
    }
    
    const packet = jsonToBinary();
    const hex = Array.from(packet).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    const decimal = Array.from(packet).join(', ');
    
    alert(`Binary Packet (${packet.length} bytes):\n\nHEX:\n${hex}\n\nDECIMAL:\n${decimal}`);
}

function loadFromJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const ic = Array.isArray(data) ? data[0] : data;
                
                document.getElementById('icName').value = ic.name || '';
                gates = ic.gates || [];
                updateGatesList();
                
                alert(`✅ Loaded ${ic.name || 'configuration'}`);
            } catch (error) {
                alert('❌ Invalid JSON file!\n\n' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

function saveToJSON() {
    if (gates.length === 0) {
        alert('⚠️ No gates to save!');
        return;
    }
    
    const icName = document.getElementById('icName').value || 'Unnamed IC';
    
    const config = [{
        name: icName,
        num_gates: gates.length,
        gates: gates
    }];
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${icName.replace(/\s+/g, '_')}.json`;
    a.click();
}

//===========================================
// MULTIPLEXERS - PLACEHOLDER
//===========================================
function updateMuxCount() {
    const container = document.getElementById('muxConfigContainer');
    container.innerHTML = '<p style="padding: 20px;">Multiplexer configuration coming soon...</p>';
}

async function testMux() {
    alert('⚠️ MUX testing requires firmware update');
}

function saveMuxConfig() {
    alert('⚠️ MUX save not yet implemented');
}

//===========================================
// COUNTERS - PLACEHOLDER
//===========================================
function updateCounterConfig() {
    const container = document.getElementById('counterPinConfig');
    container.innerHTML = '<p style="padding: 20px;">Counter configuration coming soon...</p>';
}

async function testCounter() {
    alert('⚠️ Counter testing requires firmware update');
}

function saveCounterConfig() {
    alert('⚠️ Counter save not yet implemented');
}

//===========================================
// FLIP-FLOPS - FULLY FUNCTIONAL
//===========================================
function updateFFCount() {
    const numFFs = parseInt(document.getElementById('numFFs').value);
    const container = document.getElementById('ffConfigContainer');
    
    container.innerHTML = '';
    flipflops = [];
    
    for (let i = 0; i < numFFs; i++) {
        const ffDiv = document.createElement('div');
        ffDiv.className = 'component-config';
        ffDiv.innerHTML = `
            <h3>Flip-Flop ${i + 1} Configuration</h3>
            <div class="ff-config" data-ff-index="${i}">
                <div id="ffPinConfig${i}">
                    <div class="pin-row">
                        <label>Clock Pin:</label>
                        <select id="ff${i}ClockPin"></select>
                    </div>
                    <div id="ff${i}InputPins" class="pin-group"></div>
                    <div id="ff${i}OutputPins" class="pin-group"></div>
                    <div class="pin-row">
                        <label>Set Pin (optional):</label>
                        <select id="ff${i}SetPin"></select>
                    </div>
                    <div class="pin-row">
                        <label>Reset Pin:</label>
                        <select id="ff${i}ResetPin"></select>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(ffDiv);
    }
    
    updateAllFFConfigs();
}

function updateAllFFConfigs() {
    const ffType = document.getElementById('ffType').value;
    const numFFs = parseInt(document.getElementById('numFFs').value);
    
    for (let i = 0; i < numFFs; i++) {
        updateSingleFFConfig(i, ffType);
    }
}

function updateSingleFFConfig(ffIdx, ffType) {
    const clockPin = document.getElementById(`ff${ffIdx}ClockPin`);
    if (clockPin) {
        clockPin.innerHTML = '';
        PIN_NAMES.forEach((pin) => {
            const option = document.createElement('option');
            option.value = pin;
            option.textContent = pin;
            if (pin === 'PA2') option.selected = true;
            clockPin.appendChild(option);
        });
    }
    
    const setPin = document.getElementById(`ff${ffIdx}SetPin`);
    if (setPin) {
        setPin.innerHTML = '<option value="">None</option>';
        PIN_NAMES.forEach((pin) => {
            const option = document.createElement('option');
            option.value = pin;
            option.textContent = pin;
            if (pin === 'PA3') option.selected = true;
            setPin.appendChild(option);
        });
    }
    
    const resetPin = document.getElementById(`ff${ffIdx}ResetPin`);
    if (resetPin) {
        resetPin.innerHTML = '<option value="">None</option>';
        PIN_NAMES.forEach((pin) => {
            const option = document.createElement('option');
            option.value = pin;
            option.textContent = pin;
            if (pin === 'PA0') option.selected = true;
            resetPin.appendChild(option);
        });
    }
    
    const inputPins = document.getElementById(`ff${ffIdx}InputPins`);
    if (inputPins) {
        inputPins.innerHTML = '<h4>Input Pins</h4>';
        
        switch(ffType) {
            case 'D':
                inputPins.appendChild(createPinRowWithSelect('D:', `ff${ffIdx}-input-D`, 1));
                break;
            case 'JK':
                inputPins.appendChild(createPinRowWithSelect('J:', `ff${ffIdx}-input-J`, 1));
                inputPins.appendChild(createPinRowWithSelect('K:', `ff${ffIdx}-input-K`, 6));
                break;
            case 'T':
                inputPins.appendChild(createPinRowWithSelect('T:', `ff${ffIdx}-input-T`, 1));
                break;
            case 'SR':
                inputPins.appendChild(createPinRowWithSelect('S:', `ff${ffIdx}-input-S`, 1));
                inputPins.appendChild(createPinRowWithSelect('R:', `ff${ffIdx}-input-R`, 6));
                break;
        }
    }
    
    const outputPins = document.getElementById(`ff${ffIdx}OutputPins`);
    if (outputPins) {
        outputPins.innerHTML = '<h4>Output Pins</h4>';
        outputPins.appendChild(createPinRowWithSelect('Q:', `ff${ffIdx}-output-Q`, 4));
        outputPins.appendChild(createPinRowWithSelect('/Q:', `ff${ffIdx}-output-Qn`, 5));
    }
}

function createPinRowWithSelect(label, id, defaultIdx) {
    const row = document.createElement('div');
    row.className = 'pin-row';
    row.innerHTML = `
        <label>${label}</label>
        <select id="${id}"></select>
    `;
    const select = row.querySelector('select');
    PIN_NAMES.forEach((pin, idx) => {
        const option = document.createElement('option');
        option.value = pin;
        option.textContent = pin;
        if (idx === defaultIdx % PIN_NAMES.length) option.selected = true;
        select.appendChild(option);
    });
    return row;
}

function flipflopToBinary() {
    const packet = [];
    const numFFs = parseInt(document.getElementById('numFFs').value);
    const ffType = document.getElementById('ffType').value;
    const ffStepsEl = document.getElementById('ffSteps');
    const numSteps = ffStepsEl ? parseInt(ffStepsEl.value) : 8;
    
    packet.push(0xBB);  // ← CHANGED FROM 0xAA TO 0xBB
    packet.push(0x04);  // IC_TYPE_FLIPFLOP
    packet.push(numFFs);
    
    let ffTypeCode = 0x01;
    switch(ffType) {
        case 'D': ffTypeCode = 0x01; break;
        case 'JK': ffTypeCode = 0x02; break;
        case 'T': ffTypeCode = 0x03; break;
        case 'SR': ffTypeCode = 0x04; break;
    }
    packet.push(ffTypeCode);
    
    for (let i = 0; i < numFFs; i++) {
        const clockPinEl = document.getElementById(`ff${i}ClockPin`);
        packet.push(clockPinEl ? PIN_MAP[clockPinEl.value] : PIN_MAP['PA2']);
        
        const setPinEl = document.getElementById(`ff${i}SetPin`);
        const setPinValue = setPinEl ? setPinEl.value : '';
        packet.push(setPinValue ? PIN_MAP[setPinValue] : 0xFF);
        
        const resetPinEl = document.getElementById(`ff${i}ResetPin`);
        const resetPinValue = resetPinEl ? resetPinEl.value : '';
        packet.push(resetPinValue ? PIN_MAP[resetPinValue] : 0xFF);
        
        switch(ffType) {
            case 'D':
                const dEl = document.getElementById(`ff${i}-input-D`);
                packet.push(dEl ? PIN_MAP[dEl.value] : PIN_MAP['PA1']);
                break;
            case 'JK':
                const jEl = document.getElementById(`ff${i}-input-J`);
                const kEl = document.getElementById(`ff${i}-input-K`);
                packet.push(jEl ? PIN_MAP[jEl.value] : PIN_MAP['PA1']);
                packet.push(kEl ? PIN_MAP[kEl.value] : PIN_MAP['PA6']);
                break;
            case 'T':
                const tEl = document.getElementById(`ff${i}-input-T`);
                packet.push(tEl ? PIN_MAP[tEl.value] : PIN_MAP['PA1']);
                break;
            case 'SR':
                const sEl = document.getElementById(`ff${i}-input-S`);
                const rEl = document.getElementById(`ff${i}-input-R`);
                packet.push(sEl ? PIN_MAP[sEl.value] : PIN_MAP['PA1']);
                packet.push(rEl ? PIN_MAP[rEl.value] : PIN_MAP['PA6']);
                break;
        }
        
        const qEl = document.getElementById(`ff${i}-output-Q`);
        const qnEl = document.getElementById(`ff${i}-output-Qn`);
        packet.push(qEl ? PIN_MAP[qEl.value] : PIN_MAP['PA4']);
        const qnValue = qnEl ? qnEl.value : '';
        packet.push(qnValue ? PIN_MAP[qnValue] : 0xFF);
    }
    
    packet.push(numSteps);
    packet.push(0xFF);
    
    return new Uint8Array(packet);
}

async function testFlipFlop() {
    if (!isConnected) {
        alert('⚠️ Not connected to STM32!');
        return;
    }
    
    const numFFs = parseInt(document.getElementById('numFFs').value);
    if (numFFs === 0) {
        alert('⚠️ Configure at least one flip-flop!');
        return;
    }
    
    const packet = flipflopToBinary();
    const results = document.getElementById('ffResults');
    
    const hexStr = Array.from(packet).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    results.textContent = '🧪 Testing Flip-Flop...\n';
    results.textContent += `📤 Sending ${packet.length} bytes:\n`;
    results.textContent += `HEX: ${hexStr}\n\n`;
    
    try {
        const writer = serialPort.writable.getWriter();
        await writer.write(packet);
        writer.releaseLock();
        
        results.textContent += '✅ Packet sent! Reading response...\n';
        
        // Read multiple chunks to get both debug text and binary response
        const reader = serialPort.readable.getReader();
        let allData = new Uint8Array(0);
        let attempts = 0;
        let foundBinaryResponse = false;
        
        while (attempts < 10 && !foundBinaryResponse) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const { value, done } = await reader.read();
            
            if (done) break;
            
            if (value && value.length > 0) {
                // Append new data
                const combined = new Uint8Array(allData.length + value.length);
                combined.set(allData);
                combined.set(value, allData.length);
                allData = combined;
                
                // Check if we have the binary response (starts with 0x55)
                for (let i = 0; i < allData.length - 3; i++) {
                    if (allData[i] === 0x55 && allData[i + 3] === 0xFF) {
                        foundBinaryResponse = true;
                        break;
                    }
                }
            }
            
            attempts++;
        }
        
        reader.releaseLock();
        
        // Show debug text
        const debugText = new TextDecoder().decode(allData);
        results.textContent += '\n📝 Debug Output:\n';
        results.textContent += '─'.repeat(50) + '\n';
        results.textContent += debugText;
        results.textContent += '\n' + '─'.repeat(50) + '\n\n';
        
        // Find and parse binary response
        let binaryResponse = null;
        for (let i = 0; i < allData.length - 3; i++) {
            if (allData[i] === 0x55 && allData[i + 3] === 0xFF) {
                binaryResponse = allData.slice(i, i + 4);
                break;
            }
        }
        
        if (binaryResponse) {
            handleFFResponse(binaryResponse);
        } else {
            results.textContent += '⚠️ No binary response packet found (expected: 55 XX XX FF)\n';
        }
        
    } catch (error) {
        results.textContent += '\n❌ Error: ' + error.message;
        console.error(error);
    }
}

function handleFFResponse(response) {
    const results = document.getElementById('ffResults');
    let output = results.textContent;
    
    output += '\n✅ Response received:\n';
    output += 'HEX: ' + Array.from(response).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ') + '\n\n';
    
    if (response[0] === 0x55) {
        const numFFs = response[1];
        output += '═══════════════════════════════════════\n';
        output += `Test Results for ${numFFs} flip-flop(s):\n`;
        output += '═══════════════════════════════════════\n\n';
        
        let allPass = true;
        for (let i = 0; i < numFFs; i++) {
            if (i + 2 < response.length) {
                const passed = response[2 + i] === 0x01;
                output += `  FF ${i + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}\n`;
                if (!passed) allPass = false;
            }
        }
        
        output += '\n═══════════════════════════════════════\n';
        output += `Overall: ${allPass ? '✅ ALL PASSED' : '❌ SOME FAILED'}\n`;
        output += '═══════════════════════════════════════';
    } else {
        output += '❌ Invalid response format';
    }
    
    results.textContent = output;
}

function saveFFConfig() {
    const numFFs = parseInt(document.getElementById('numFFs').value);
    const ffType = document.getElementById('ffType').value;  // ← FIXED - removed extra )

    const ffConfigs = [];
    for (let i = 0; i < numFFs; i++) {
        const config = {
            clockPin: '',
            setPin: '',
            resetPin: '',
            inputPins: {},
            outputPins: {}
        };
        
        const clockPinEl = document.getElementById(`ff${i}ClockPin`);
        if (clockPinEl) config.clockPin = clockPinEl.value;
        
        const setPinEl = document.getElementById(`ff${i}SetPin`);
        if (setPinEl) config.setPin = setPinEl.value;
        
        const resetPinEl = document.getElementById(`ff${i}ResetPin`);
        if (resetPinEl) config.resetPin = resetPinEl.value;
        
        switch(ffType) {
            case 'D':
                const dInputEl = document.getElementById(`ff${i}-input-D`);
                if (dInputEl) config.inputPins.D = dInputEl.value;
                break;
            case 'JK':
                const jInputEl = document.getElementById(`ff${i}-input-J`);
                const kInputEl = document.getElementById(`ff${i}-input-K`);
                if (jInputEl) config.inputPins.J = jInputEl.value;
                if (kInputEl) config.inputPins.K = kInputEl.value;
                break;
            case 'T':
                const tInputEl = document.getElementById(`ff${i}-input-T`);
                if (tInputEl) config.inputPins.T = tInputEl.value;
                break;
            case 'SR':
                const sInputEl = document.getElementById(`ff${i}-input-S`);
                const rInputEl = document.getElementById(`ff${i}-input-R`);
                if (sInputEl) config.inputPins.S = sInputEl.value;
                if (rInputEl) config.inputPins.R = rInputEl.value;
                break;
        }
        
        const qOutputEl = document.getElementById(`ff${i}-output-Q`);
        const qnOutputEl = document.getElementById(`ff${i}-output-Qn`);
        if (qOutputEl) config.outputPins.Q = qOutputEl.value;
        if (qnOutputEl) config.outputPins.Qn = qnOutputEl.value;
        
        ffConfigs.push(config);
    }
    
    const ffNameEl = document.getElementById('ffName');
    const ffStepsEl = document.getElementById('ffSteps');
    
    const config = {
        type: ffType,
        name: ffNameEl ? ffNameEl.value : 'Unnamed FF',
        numFFs: numFFs,
        steps: ffStepsEl ? ffStepsEl.value : '8',
        flipflops: ffConfigs
    };
    
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name || 'flipflop'}_config.json`;
    a.click();
}
function loadFFConfig() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                const ffData = Array.isArray(data) ? data[0] : data;

                // Restore main fields
                if (document.getElementById('ffName'))
                    document.getElementById('ffName').value = ffData.name || '';
                if (document.getElementById('ffType'))
                    document.getElementById('ffType').value = ffData.type || 'D';
                if (document.getElementById('numFFs'))
                    document.getElementById('numFFs').value = ffData.numFFs || 1;
                if (document.getElementById('ffSteps'))
                    document.getElementById('ffSteps').value = ffData.steps || 8;

                // Rebuild UI with correct FF count/type
                updateFFCount();
                document.getElementById('ffType').value = ffData.type || 'D';
                updateAllFFConfigs();

                // Apply loaded pin selections
                ffData.flipflops.forEach((ff, i) => {
                    if (document.getElementById(`ff${i}ClockPin`))
                        document.getElementById(`ff${i}ClockPin`).value = ff.clockPin || '';
                    if (document.getElementById(`ff${i}SetPin`))
                        document.getElementById(`ff${i}SetPin`).value = ff.setPin || '';
                    if (document.getElementById(`ff${i}ResetPin`))
                        document.getElementById(`ff${i}ResetPin`).value = ff.resetPin || '';

                    for (const [key, value] of Object.entries(ff.inputPins || {})) {
                        const el = document.getElementById(`ff${i}-input-${key}`);
                        if (el) el.value = value;
                    }
                    for (const [key, value] of Object.entries(ff.outputPins || {})) {
                        const el = document.getElementById(`ff${i}-output-${key}`);
                        if (el) el.value = value;
                    }
                });

                alert(`✅ Loaded Flip-Flop configuration: ${ffData.name || 'Unnamed'}`);
            } catch (error) {
                alert('❌ Invalid Flip-Flop JSON!\n\n' + error.message);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}
