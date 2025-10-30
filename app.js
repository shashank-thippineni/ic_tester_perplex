//===========================================
// PIN MAPPING & GLOBAL STATE
//===========================================

// Pin mappings for UNO and Mega
const PIN_MAPS = {
  UNO: {
    "D2": 0x00, "D3": 0x01, "D4": 0x02, "D5": 0x03,
    "D6": 0x04, "D7": 0x05, "D8": 0x06, "D9": 0x07,
    "D10": 0x10, "D11": 0x11, "D12": 0x1A, "D13": 0x1B
  },
  MEGA: {
    "D22": 0x00, "D23": 0x01, "D24": 0x02, "D25": 0x03,
    "D26": 0x04, "D27": 0x05, "D28": 0x06, "D29": 0x07,
    "D30": 0x10, "D31": 0x11, "D32": 0x1A, "D33": 0x1B
  }
};

let currentBoard = 'UNO';
let PIN_MAP = PIN_MAPS.UNO;
let PIN_NAMES = Object.keys(PIN_MAP);

let serialPort = null;
let gates = [];
let muxes = [];
let flipflops = [];
let isConnected = false;
let currentICType = '';

//===========================================
// BOARD TYPE SELECTION
//===========================================

function updateBoardType() {
  currentBoard = document.getElementById('boardSelector').value;
  PIN_MAP = PIN_MAPS[currentBoard];
  PIN_NAMES = Object.keys(PIN_MAP);
  
  // Clear all configurations when changing board
  gates = [];
  flipflops = [];
  updateGatesList();
  
  console.log(`✅ Switched to ${currentBoard} - Pins: ${PIN_NAMES.join(', ')}`);
  
  // If gate dialog is open, update it
  if (document.getElementById('gateModal').classList.contains('active')) {
    updatePinSelectors();
  }
  
  // Update any active interface
  if (currentICType === 'flipflop') {
    updateFFCount();
  }
}

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
         
    
          break;
        case 'counter':
          updateCounterConfig();
          break;
        case 'flipflop':
          updateFFCount();
          break;
        case 'analog':
          document.getElementById('analog-interface').style.display = 'block';
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
    const port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    serialPort = port;
    isConnected = true;
    updateConnectionStatus(true);

    console.log(`✅ ${currentBoard} connected`);
  } catch (error) {
    if (error.name === 'NotFoundError') {
      alert('❌ No device found!\n\nPlease:\n1. Connect Arduino via USB\n2. Close Arduino IDE Serial Monitor\n3. Try again');
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
    status.textContent = `Connected (${currentBoard})`;
    status.className = 'status connected';
    btn.textContent = 'Disconnect';
    btn.className = 'btn-danger';
  } else {
    status.textContent = 'Disconnected';
    status.className = 'status disconnected';
    btn.textContent = 'Connect to Arduino';
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
  header.style.fontWeight = 'bold';
  header.style.fontSize = '1.1em';
  header.innerHTML = `Truth Table (${combinations} combinations):`;
  truthTable.appendChild(header);

  // Create a table-like grid
  const tableContainer = document.createElement('div');
  tableContainer.style.display = 'grid';
  tableContainer.style.gridTemplateColumns = '150px 80px';
  tableContainer.style.gap = '8px';
  tableContainer.style.marginTop = '10px';

  // Header row
  const headerInput = document.createElement('div');
  headerInput.style.fontWeight = 'bold';
  headerInput.style.padding = '8px';
  headerInput.style.background = '#f0f0f0';
  headerInput.style.borderRadius = '4px';
  headerInput.textContent = 'Input';
  
  const headerOutput = document.createElement('div');
  headerOutput.style.fontWeight = 'bold';
  headerOutput.style.padding = '8px';
  headerOutput.style.background = '#f0f0f0';
  headerOutput.style.borderRadius = '4px';
  headerOutput.textContent = 'Output';

  tableContainer.appendChild(headerInput);
  tableContainer.appendChild(headerOutput);

  // Data rows
  for (let i = 0; i < combinations; i++) {
    const inputBits = i.toString(2).padStart(numInputs, '0');
    
    const inputCell = document.createElement('div');
    inputCell.style.padding = '8px';
    inputCell.style.background = '#fafafa';
    inputCell.style.borderRadius = '4px';
    inputCell.style.fontFamily = 'monospace';
    inputCell.textContent = inputBits;

    const outputCell = document.createElement('div');
    outputCell.style.padding = '8px';
    outputCell.style.background = '#fafafa';
    outputCell.style.borderRadius = '4px';
    outputCell.style.display = 'flex';
    outputCell.style.alignItems = 'center';
    outputCell.style.justifyContent = 'center';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'truth-checkbox';
    checkbox.setAttribute('data-index', i);
    checkbox.style.width = '20px';
    checkbox.style.height = '20px';
    checkbox.style.cursor = 'pointer';

    outputCell.appendChild(checkbox);
    
    tableContainer.appendChild(inputCell);
    tableContainer.appendChild(outputCell);
  }

  truthTable.appendChild(tableContainer);
}


function saveGate() {
  const numInputs = parseInt(document.getElementById('numInputs').value);
  const numOutputs = parseInt(document.getElementById('numOutputs').value);

  const inputSelects = document.querySelectorAll('.input-pin-select');
  const outputSelects = document.querySelectorAll('.output-pin-select');

  const inputPins = Array.from(inputSelects).map(s => s.value);
  const outputPins = Array.from(outputSelects).map(s => s.value);

  const truthCheckboxes = document.querySelectorAll('.truth-checkbox');
  const truthTable = Array.from(truthCheckboxes).map(cb => [cb.checked ? 1 : 0]);

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
  const list = document.getElementById('gatesList');
  
  if (gates.length === 0) {
    list.innerHTML = '<p style="color:#999;">No gates configured yet</p>';
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
    alert('⚠️ Not connected to Arduino!');
    return;
  }

  if (gates.length === 0) {
    alert('⚠️ No gates configured!');
    return;
  }

  const packet = jsonToBinary();
  const results = document.getElementById('results');

  const hexStr = Array.from(packet).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  results.textContent = `🧪 Testing IC on ${currentBoard}...\n`;
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
      results.textContent += '\n❌ No response from Arduino\n';
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

  let binaryStart = -1;
  let numGates = 0;

  for (let i = 0; i < response.length - 3; i++) {
    if (response[i] === 0x55) {
      const potentialCount = response[i + 1];

      if (potentialCount >= 1 && potentialCount <= 8) {
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
    board: currentBoard,
    num_gates: gates.length,
    gates: gates
  }];

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${icName.replace(/\s+/g, '_')}_${currentBoard}.json`;
  a.click();
}

//===========================================
// MULTIPLEXER/DEMULTIPLEXER TESTING
//===========================================


function updateMuxUI() {
    const mode = document.getElementById('muxMode').value;
    const typeSelect = document.getElementById('muxType');
    const pinConfig = document.getElementById('muxPinConfig');
    pinConfig.innerHTML = '';
    if (!mode) {
        typeSelect.innerHTML = '<option value="">-- Select Type --</option>';
        typeSelect.onchange = null;
        return;
    }

    // Populate type dropdown
    if (mode === 'mux') {
        typeSelect.innerHTML = `
            <option value="">-- Select Type --</option>
            <option value="2">2:1 MUX</option>
            <option value="4">4:1 MUX</option>
            <option value="8">8:1 MUX</option>
            <option value="16">16:1 MUX</option>
        `;
    } else if (mode === 'demux') {
        typeSelect.innerHTML = `
            <option value="">-- Select Type --</option>
            <option value="2">1:2 DEMUX</option>
            <option value="4">1:4 DEMUX</option>
            <option value="8">1:8 DEMUX</option>
            <option value="16">1:16 DEMUX</option>
        `;
    }

    // THIS IS THE KEY: listen for changes and call config generator
    typeSelect.onchange = function() {
        if (typeSelect.value) {
            generateMuxPinConfig(mode, parseInt(typeSelect.value));
        } else {
            pinConfig.innerHTML = "";
        }
    };
}




function generateMuxPinConfig(mode, numChannels) {
    const pinConfig = document.getElementById('muxPinConfig');
    const numSelects = Math.log2(numChannels);
    let html = '<div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">';

    if (mode === 'mux') {
        html += '<h3>Pin Configuration</h3>';
        html += '<div><strong>Input Pins:</strong></div>';
        for (let i = 0; i < numChannels; i++) {
            html += `
                <div class="pin-row">
                    <label>I${i}:</label>
                    <select id="mux_input_${i}">
                        ${PIN_NAMES.map(pin => `<option value="${pin}">${pin}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        html += '<div><strong>Select Lines:</strong></div>';
        for (let i = 0; i < numSelects; i++) {
            html += `
                <div class="pin-row">
                    <label>S${i}:</label>
                    <select id="mux_select_${i}">
                        ${PIN_NAMES.map(pin => `<option value="${pin}">${pin}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        html += `
            <div class="pin-row">
                <label>OUT:</label>
                <select id="mux_output">
                    ${PIN_NAMES.map(pin => `<option value="${pin}">${pin}</option>`).join('')}
                </select>
            </div>
        `;
    } else if (mode === 'demux') {
        html += '<h3>Pin Configuration</h3>';
        html += `
            <div class="pin-row">
                <label>IN:</label>
                <select id="demux_input">
                    ${PIN_NAMES.map(pin => `<option value="${pin}">${pin}</option>`).join('')}
                </select>
            </div>
        `;
        html += '<div><strong>Select Lines:</strong></div>';
        for (let i = 0; i < numSelects; i++) {
            html += `
                <div class="pin-row">
                    <label>S${i}:</label>
                    <select id="demux_select_${i}">
                        ${PIN_NAMES.map(pin => `<option value="${pin}">${pin}</option>`).join('')}
                    </select>
                </div>
            `;
        }
        html += '<div><strong>Output Pins:</strong></div>';
        for (let i = 0; i < numChannels; i++) {
            html += `
                <div class="pin-row">
                    <label>O${i}:</label>
                    <select id="demux_output_${i}">
                        ${PIN_NAMES.map(pin => `<option value="${pin}">${pin}</option>`).join('')}
                    </select>
                </div>
            `;
        }
    }

    html += '</div>';
    pinConfig.innerHTML = html;
}



async function runMuxTest() {
    if (!isConnected) {
        alert('⚠️ Not connected to Arduino!');
        return;
    }

    const mode = document.getElementById('muxMode').value;
    const type = document.getElementById('muxType').value;

    if (!mode || !type) {
        alert('⚠️ Please select both mode and type!');
        return;
    }

    const numChannels = parseInt(type);
    const numSelects = Math.log2(numChannels);
    const packet = [0xCC]; // Packet type for MUX/DEMUX

    if (mode === 'mux') {
        packet.push(0x01); // Mode: MUX
        packet.push(numChannels); // Type
        packet.push(numSelects); // Number of select lines

        // Add input pins
        for (let i = 0; i < numChannels; i++) {
            const pin = document.getElementById(`mux_input_${i}`).value;
            packet.push(PIN_MAP[pin]);
        }

        // Add select pins
        for (let i = 0; i < numSelects; i++) {
            const pin = document.getElementById(`mux_select_${i}`).value;
            packet.push(PIN_MAP[pin]);
        }

        // Add output pin
        const outputPin = document.getElementById('mux_output').value;
        packet.push(PIN_MAP[outputPin]);

    } else if (mode === 'demux') {
        packet.push(0x02); // Mode: DEMUX
        packet.push(numChannels); // Type
        packet.push(numSelects); // Number of select lines

        // Add input pin
        const inputPin = document.getElementById('demux_input').value;
        packet.push(PIN_MAP[inputPin]);

        // Add select pins
        for (let i = 0; i < numSelects; i++) {
            const pin = document.getElementById(`demux_select_${i}`).value;
            packet.push(PIN_MAP[pin]);
        }

        // Add output pins
        for (let i = 0; i < numChannels; i++) {
            const pin = document.getElementById(`demux_output_${i}`).value;
            packet.push(PIN_MAP[pin]);
        }
    }

    packet.push(0xFF); // End marker

    const results = document.getElementById('muxResults');
    const hexStr = Array.from(packet).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
    
    results.innerHTML = `
        <strong>🧪 Testing ${mode.toUpperCase()} ${type}:1...</strong><br>
        📤 Sending ${packet.length} bytes<br>
        HEX: ${hexStr}<br><br>
    `;

    try {
        const writer = serialPort.writable.getWriter();
        await writer.write(new Uint8Array(packet));
        writer.releaseLock();

        results.innerHTML += '✅ Packet sent! Waiting for response...<br>';

        await new Promise(resolve => setTimeout(resolve, 1500));

        const reader = serialPort.readable.getReader();
        const { value, done } = await reader.read();
        reader.releaseLock();

        if (value && value.length > 0) {
            handleMuxResponse(value, mode, numChannels);
        } else {
            results.innerHTML += '<br>❌ No response from Arduino';
        }
    } catch (error) {
        results.innerHTML += '<br>❌ Error: ' + error.message;
        console.error(error);
    }
}

function handleMuxResponse(response, mode, numChannels) {
    const results = document.getElementById('muxResults');
    let output = results.innerHTML;

    output += '<br>✅ Response received:<br>';
    output += 'HEX: ' + Array.from(response).map(b => 
        b.toString(16).padStart(2, '0').toUpperCase()
    ).join(' ') + '<br><br>';

    // Find response packet: 0x55 [count] [data...] 0xFF
    let startIdx = -1;
    for (let i = 0; i < response.length - 2; i++) {
        if (response[i] === 0x55 && response[response.length - 1] === 0xFF) {
            startIdx = i;
            break;
        }
    }

    if (startIdx === -1) {
        output += '❌ Invalid response format<br>';
        results.innerHTML = output;
        return;
    }

    const numResults = response[startIdx + 1];
    output += '<strong>📊 Test Results:</strong><br>';
    output += '═══════════════════════════════════<br>';

    if (mode === 'mux') {
        output += `MUX ${numChannels}:1 Test:<br><br>`;
        for (let i = 0; i < numResults; i++) {
            const value = response[startIdx + 2 + i];
            const selectCombo = i.toString(2).padStart(Math.log2(numChannels), '0');
            output += `Select ${selectCombo} → Output: ${value}<br>`;
        }
    } else if (mode === 'demux') {
        output += `DEMUX 1:${numChannels} Test:<br><br>`;
        let allPass = true;
        for (let i = 0; i < numResults; i++) {
            const value = response[startIdx + 2 + i];
            const selectCombo = i.toString(2).padStart(Math.log2(numChannels), '0');
            const expected = 1 << i;
            const passed = (value === expected);
            output += `Select ${selectCombo} → Outputs: ${value.toString(2).padStart(numChannels, '0')} ${passed ? '✅' : '❌'}<br>`;
            if (!passed) allPass = false;
        }
        output += '<br>═══════════════════════════════════<br>';
        output += `<strong>Overall: ${allPass ? '✅ PASS' : '❌ FAIL'}</strong><br>`;
    }

    output += '═══════════════════════════════════';
    results.innerHTML = output;
}



//===========================================
// COUNTERS - PLACEHOLDER
//===========================================

function updateCounterConfig() {
  const container = document.getElementById('counterPinConfig');
  container.innerHTML = '<p style="color:#666;">Counter configuration coming soon...</p>';
}
function updateCounterPinUI() {
  const type = document.getElementById("counterType").value;
  const mode = document.getElementById("counterPinMode").value;
  const container = document.getElementById("counterPinConfig");
  container.innerHTML = "";

  if (!type) return;

  if (mode === "auto") {
    let defaults = {};
    if (type === "4017") {
      defaults = {
        clock: 22,
        reset: 23,
        outputs: [24, 25, 26, 27, 28, 29, 30, 31, 32, 33],
      };
    } else if (type === "7493") {
      defaults = {
        clock: 22,
        reset: 23,
        outputs: [24, 25, 26, 27],
      };
    }

    container.innerHTML = `
      <div class="component-config">
        <h3>Default Pins for ${type}</h3>
        <p><b>Clock:</b> D${defaults.clock}</p>
        <p><b>Reset:</b> D${defaults.reset}</p>
        <p><b>Outputs:</b> ${defaults.outputs.map(p => 'D' + p).join(', ')}</p>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="component-config">
        <h3>Manual Pin Entry</h3>
        <div class="pin-row"><label>Clock Pin:</label>
          <input id="counterClockPin" placeholder="e.g. 22"></div>
        <div class="pin-row"><label>Reset Pin:</label>
          <input id="counterResetPin" placeholder="e.g. 23"></div>
        <div class="pin-row"><label>Output Pins (comma separated):</label>
          <input id="counterOutputPins" placeholder="e.g. 24,25,26,27">
        </div>
      </div>
    `;
  }
}

async function testCounter() {
  const type = document.getElementById("counterType").value;
  const mode = document.getElementById("counterPinMode").value;
  const pulses = parseInt(document.getElementById("counterPulses").value);
  let clock, reset, outputs = [];

  if (mode === "manual") {
    clock = parseInt(document.getElementById("counterClockPin").value);
    reset = parseInt(document.getElementById("counterResetPin").value);
    outputs = document.getElementById("counterOutputPins").value.split(",").map(x => parseInt(x.trim()));
  } else if (type === "4017") {
    clock = 22; reset = 23; outputs = [24,25,26,27,28,29,30,31,32,33];
  } else if (type === "7493") {
    clock = 22; reset = 23; outputs = [24,25,26,27];
  }

  const data = [0xDD, clock, reset, outputs.length, pulses, ...outputs, 0xFF];
  await sendPacket(data, "counterResults", "Testing Counter...");
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
  const sameType = document.getElementById('sameTypeToggle').checked;
  container.innerHTML = '';

  for (let i = 0; i < numFFs; i++) {
    const ffDiv = document.createElement('div');
    ffDiv.className = 'ff-config';
    ffDiv.style.marginBottom = '15px';

    const ffTitle = document.createElement('h3');
    ffTitle.textContent = `Flip-Flop ${i + 1}`;
    ffDiv.appendChild(ffTitle);

    // Flip-flop type selector
    const typeSelect = document.createElement('select');
    typeSelect.id = `ffType${i}`;
    typeSelect.innerHTML = `
      <option value="D">D Flip-Flop</option>
      <option value="JK">JK Flip-Flop</option>
      <option value="T">T Flip-Flop</option>
      <option value="SR">SR Flip-Flop</option>
    `;
    typeSelect.onchange = () => renderPinSelectors(i);
    ffDiv.appendChild(typeSelect);

    const pinDiv = document.createElement('div');
    pinDiv.id = `pinConfig${i}`;
    pinDiv.style.marginTop = '10px';
    ffDiv.appendChild(pinDiv);

    container.appendChild(ffDiv);
  }

  for (let i = 0; i < numFFs; i++) renderPinSelectors(i);
}

function renderPinSelectors(index) {
  const sameType = document.getElementById('sameTypeToggle').checked;
  const type = document.getElementById(`ffType${index}`).value;

  // If same type selected, update all type dropdowns
  if (sameType) {
    const total = parseInt(document.getElementById('numFFs').value);
    for (let j = 0; j < total; j++) {
      document.getElementById(`ffType${j}`).value = type;
    }
  }

  const container = document.getElementById(`pinConfig${index}`);
  container.innerHTML = '';

  const pinSets = {
    D: ['CLK', 'D', 'Q', 'PRE', 'CLR'],
    JK: ['CLK', 'J', 'K', 'Q', 'PRE', 'CLR'],
    T: ['CLK', 'T', 'Q', 'PRE', 'CLR'],
    SR: ['CLK', 'S', 'R', 'Q', 'PRE', 'CLR']
  };

  const pins = pinSets[type];
  pins.forEach((pin, idx) => {
    const row = document.createElement('div');
    row.className = 'pin-row';
    
    const label = document.createElement('label');
    label.textContent = `${pin} Pin:`;
    
    const select = document.createElement('select');
    select.id = `ff${index}_${pin}`;
    
    PIN_NAMES.forEach((pinName, i) => {
      const option = document.createElement('option');
      option.value = pinName;
      option.textContent = pinName;
      if (i === idx) option.selected = true;
      select.appendChild(option);
    });
    
    row.appendChild(label);
    row.appendChild(select);
    container.appendChild(row);
  });

  // Only update OTHER flip-flops if same type is checked
  // Remove recursive call at end to prevent infinite loop
}

async function testFlipFlops() {
  if (!isConnected) {
    alert('⚠️ Not connected to Arduino!');
    return;
  }

  const numFFs = parseInt(document.getElementById('numFFs').value);
  const packet = [0xBB, numFFs];

  for (let i = 0; i < numFFs; i++) {
    const type = document.getElementById(`ffType${i}`).value;
    let typeCode = 0x01;
    switch (type) {
      case 'D': typeCode = 0x01; break;
      case 'JK': typeCode = 0x02; break;
      case 'T': typeCode = 0x03; break;
      case 'SR': typeCode = 0x04; break;
    }
    packet.push(typeCode);

    const pinSets = {
      D: ['CLK', 'D', 'Q', 'PRE', 'CLR'],
      JK: ['CLK', 'J', 'K', 'Q', 'PRE', 'CLR'],
      T: ['CLK', 'T', 'Q', 'PRE', 'CLR'],
      SR: ['CLK', 'S', 'R', 'Q', 'PRE', 'CLR']
    };

    for (const pin of pinSets[type]) {
      const pinName = document.getElementById(`ff${i}_${pin}`).value;
      packet.push(PIN_MAP[pinName]);
    }
  }

  packet.push(0xFF);

  const results = document.getElementById('ffResults');
  const hexStr = Array.from(packet).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
  
  results.textContent = `🧪 Testing ${numFFs} Flip-Flop(s)...\n`;
  results.textContent += `📤 Sending ${packet.length} bytes:\n`;
  results.textContent += `HEX: ${hexStr}\n\n`;

  try {
    const writer = serialPort.writable.getWriter();
    await writer.write(new Uint8Array(packet));
    writer.releaseLock();

    results.textContent += '✅ Packet sent! Waiting for response...\n';

    await new Promise(resolve => setTimeout(resolve, 2000));

    const reader = serialPort.readable.getReader();
    const { value, done } = await reader.read();
    reader.releaseLock();

    if (value && value.length > 0) {
      handleFFResponse(value);
    } else {
      results.textContent += '\n❌ No response from Arduino\n';
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

  let binaryStart = -1;
  let numFFs = 0;

  for (let i = 0; i < response.length - 3; i++) {
    if (response[i] === 0x55) {
      const potentialCount = response[i + 1];

      if (potentialCount >= 1 && potentialCount <= 8) {
        const expectedEnd = i + 2 + potentialCount;
        if (expectedEnd < response.length && response[expectedEnd] === 0xFF) {
          binaryStart = i;
          numFFs = potentialCount;
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

  output += '📊 Flip-Flop Test Results:\n';
  output += '═══════════════════════════════════════\n';
  output += `Tested ${numFFs} flip-flop(s):\n\n`;

  let allPass = true;
  for (let i = 0; i < numFFs; i++) {
    const passed = response[binaryStart + 2 + i] === 0x01;
    output += `  FF ${i + 1}: ${passed ? '✅ PASS' : '❌ FAIL'}\n`;
    if (!passed) allPass = false;
  }

  output += '\n═══════════════════════════════════════\n';
output += `Overall: ${allPass ? '✅ ALL FLIP-FLOPS PASSED! 🎉' : '❌ SOME FLIP-FLOPS FAILED'}\n`;
output += '═══════════════════════════════════════';

results.textContent = output;
}

function saveFFConfig() {
  if (flipflops.length === 0) {
    alert('⚠️ No flip-flops configured!');
    return;
  }

  const config = {
    name: 'Flip-Flop Configuration',
    board: currentBoard,
    flipflops: flipflops
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flipflop_config_${currentBoard}.json`;
  a.click();
}

function loadFFConfig() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        flipflops = data.flipflops || [];
        
        if (data.board && data.board !== currentBoard) {
          alert(`⚠️ This config was saved for ${data.board}. Currently using ${currentBoard}.`);
        }
        
        document.getElementById('numFFs').value = flipflops.length;
        updateFFCount();
        
        // Populate the loaded values
        flipflops.forEach((ff, i) => {
  document.getElementById(`ff${i}_CLK`).value = ff.clk;
  document.getElementById(`ff${i}_D`).value = ff.d;
  document.getElementById(`ff${i}_Q`).value = ff.q;
  if ('PRE' in ff) document.getElementById(`ff${i}_PRE`).value = ff.PRE;
  if ('CLR' in ff) document.getElementById(`ff${i}_CLR`).value = ff.CLR;
});


        alert(`✅ Loaded configuration`);
      } catch (error) {
        alert('❌ Invalid JSON file!\n\n' + error.message);
      }
    };

    reader.readAsText(file);
  };

  input.click();
}
// ============================================
// ANALOG IC TESTING - NE555 TIMER
// ============================================

async function testNE555() {
  if (!isConnected) {
    alert('⚠️ Not connected to Arduino!');
    return;
  }

  const results = document.getElementById('analogResults');
  results.textContent = "🧪 Testing NE555 Timer...\n";

  const packet = new Uint8Array([0xEE, 0xFF]); // command only — pins are fixed in Arduino

  try {
    const writer = serialPort.writable.getWriter();
    await writer.write(packet);
    writer.releaseLock();

    results.textContent += "✅ Packet sent! Waiting for response...\n";

    await new Promise(resolve => setTimeout(resolve, 3000));

    const reader = serialPort.readable.getReader();
    const { value, done } = await reader.read();
    reader.releaseLock();

    if (value && value.length > 0) {
      handleNE555Response(value);
    } else {
      results.textContent += "\n❌ No response from Arduino\n";
    }
  } catch (error) {
    results.textContent += "\n❌ Error: " + error.message;
    console.error(error);
  }
}

function handleNE555Response(response) {
  const results = document.getElementById('analogResults');
  let output = results.textContent;

  // Convert bytes to readable text
  const text = new TextDecoder().decode(response);
  output += "\n✅ Response received:\n" + text + "\n\n";

  // Try to extract the mean frequency and pass/fail
  const freqMatch = text.match(/([\d.]+)\s*Hz/);
  const statusMatch = text.match(/Status:\s*(PASS|FAIL)/i);

  if (freqMatch) {
    const freq = parseFloat(freqMatch[1]);
    output += `📈 Mean Frequency: ${freq.toFixed(2)} Hz\n`;
  }

  if (statusMatch) {
    const status = statusMatch[1].toUpperCase();
    output += status === "PASS"
      ? "✅ NE555 Output within 10 Hz range (PASS)"
      : "❌ NE555 Output outside 10 Hz range (FAIL)";
  }

  results.textContent = output;
}
