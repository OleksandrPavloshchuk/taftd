// Controls:
const errorMessage = document.querySelector("#errorMessage");

const loginPage = document.querySelector("#loginPage");
const inputMyId = document.querySelector("#inputMyId");
const doLogin = document.querySelector("#doLogin");

const callPage = document.querySelector("#callPage");
const callTitle = document.querySelector("#callTitle");
const inputAbonentId = document.querySelector("#inputAbonentId");
const doLogout = document.querySelector("#doLogout");
const doCall = document.querySelector("#doCall");

const callingPage = document.querySelector("#callingPage");
const callingTitle = document.querySelector("#callingTitle");
const doCallCancel = document.querySelector("#doCallCancel");

const callResponsePage = document.querySelector("#callResponsePage");
const callResponseTitle = document.querySelector("#callResponseTitle");
const doAccept = document.querySelector("#doAccept");
const doReject = document.querySelector("#doReject");

const chatPage = document.querySelector("#chatPage");
const chatTitle = document.querySelector("#chatTitle");
const doSend = document.querySelector("#doSend");
const selectFile = document.querySelector("#selectFile");
const doTransferFile = document.querySelector("#doTransferFile");
const doDisconnect = document.querySelector("#doDisconnect");
const chatHistory = document.querySelector("#chatHistory");
const chatMessage = document.querySelector("#chatMessage");
const fileSaver = document.querySelector("#fileSaver");

const fileTransferingPage = document.querySelector("#fileTransferingPage");
const fileTransferingTitle = document.querySelector("#fileTransferingTitle");
const fileTransferingProgress = document.querySelector("#fileTransferingProgress");

// Constant signalsUrl is defined in dynamic module:
const signalsConnection = new WebSocket(signalsUrl);

const chunkFileSize = 32000;

var mode = 'login';
var myId = null;
var abonentId = null;
var transferFileBuffer = "";

hide(fileSaver);
switchToMode('login');

// Signals connections events listener:
signalsConnection.onopen = () => console.log('Connected to WS server');
signalsConnection.onerror = err => raiseError("Connection error: " + JSON.stringify(err));

signalsConnection.onmessage = msg => {
    console.log('Received message:', msg.data);
    const signal = JSON.parse(msg.data);

    switch(signal.type) {
        case 'login-accepted':
            onLoginAccepted();
            break;
        case 'login-rejected':
            onLoginRejected();
            break;            
        case 'call':
            onCall(signal.from);
            break;            
        case 'call-cancel':
            onCallCancel();
            break;
        case 'call-accepted':
            onCallAccepted(signal.from);            
            break;            
        case 'call-rejected':
            onCallRejected(signal.from);
            break;
        case 'disconnect':
            onAnotherUserDisconnected(signal.from);
            break;
        case 'message':
            addToHistory(signal.from, signal.text);
            break;
        case 'transfer-file':
            acceptFile(signal);
            break;            
        case 'transfer-file-last':
            acceptFileLast(signal);
            break;            
        default:            
            raiseError("unexpected signal type: " + signal.type);
    }
};

// Buttons click listeners:
doLogin.addEventListener('click', () => { 
    if (isNotEmpty(inputMyId)) {
        myId = inputMyId.value;
        sendSignal('login');
    }
});

doLogout.addEventListener('click', () => {    
    switchToMode('login');
    sendSignal('logout');    
    myId = null;
    inputMyId.value = null;
});

doCall.addEventListener('click', () => {   
    if (isNotEmpty(inputAbonentId) && inputAbonentId.value!=myId) {
        abonentId = inputAbonentId.value;
        sendSignal('call');
        callingTitle.innerHTML = `Calling ${abonentId}`;
        switchToMode('calling');
    }
});

doCallCancel.addEventListener('click', () => {   
    sendSignal('call-cancel');
    switchToMode('call');
});

doAccept.addEventListener('click', () => {   
    sendSignal('call-accepted');
    openChat(abonentId);
});

doReject.addEventListener('click', () => {   
    sendSignal('call-rejected');
    switchToMode('call');
});

doDisconnect.addEventListener('click', () => {  
    sendSignal('disconnect');      
    inputAbonentId.value = "";  
    abonentId = null;
    switchToMode('call');
});

doSend.addEventListener('click', () => {    
    if (isNotEmpty(chatMessage)) {
        sendSignal('message', chatMessage.value);
        addToHistory(myId, chatMessage.value);
        chatMessage.value = "";
    }
});

doTransferFile.addEventListener('click', () => {  
    if (selectFile.files && selectFile.files[0]) {
        switchToMode('file-transfering');
        const file = selectFile.files[0];
        fileTransferingTitle.innerHTML = `Transfering '${file.name}' to ${abonentId}`;
        fileTransferingProgress.style.width = '0%';
        const reader = new FileReader();
        reader.onload = ev => {
            var binaryData = ev.target.result;
            var encodedData = toBase64(binaryData);
            var batchCount = Math.floor((encodedData.length + 1) / chunkFileSize) + 1;
            for (var i=0; i<batchCount; i++) {
                const pc = Math.floor( ((i+1)*100.0) / parseFloat(batchCount));
                const style = `${pc}%`;
                fileTransferingProgress.style.width = style;
                const isLast = i==batchCount-1;
                const type = isLast ? 'transfer-file-last' : 'transfer-file';
                const offset = i * chunkFileSize;
                const len = isLast ? encodedData.length - offset : chunkFileSize;
                const s = encodedData.substring( offset, offset+len);
                sendSignalObj({
                    type,
                    fileName: file.name,
                    fileType: file.type,
                    fileContent: s
                });
            }
            selectFile.value = '';
            switchToMode('chat');
        };
        reader.readAsBinaryString(file);
    }
});

// Web socket messages handlers:
function onLoginAccepted(anotherId) {
    callTitle.innerHTML = myId + " calls";
    switchToMode('call');
}

function onLoginRejected() { 
    raiseError("User " + myId + " is already logged in");
}

function onCall(anotherId) {
    abonentId = anotherId;
    if (mode=='call') {
        switchToMode('call-response');
        callResponseTitle.innerHTML = "Call from " + abonentId;
    } else {
        sendSignal('call-rejected');
        abonentId = null;
    }     
}

function onCallAccepted(anotherId) {
    openChat(anotherId);
}

function onCallRejected(anotherId) {
    raiseError("User " + anotherId + " rejected your call");
}

function onAnotherUserDisconnected(anotherId) {
    switchToMode('call');
    raiseError(`User ${anotherId} disconnected`);
}

function onCallCancel() {
    switchToMode('call');
    raiseError(`User ${abonentId} cancelled call`);
}

function addToHistory(userId, text) {
    const date = new Date();
    const dateStr = date.toLocaleString();
    chatHistory.innerHTML = 
        `<dt class="col-sm-3">[${dateStr}] ${userId}:</dt><dd class="col-sm-9">${text}</dd>`
        + chatHistory.innerHTML;
}

function acceptFile(signal) {
    transferFileBuffer = transferFileBuffer + signal.fileContent;
}

function acceptFileLast(signal) {
    const type = signal.fileType;
    const name = signal.fileName;
    transferFileBuffer = transferFileBuffer + signal.fileContent;

    const blob = new Blob( [fromBase64(transferFileBuffer, type)], {type});
    fileSaver.download = name;
    fileSaver.href = window.URL.createObjectURL(blob);
    fileSaver.click(); 
    transferFileBuffer = "";
}

// Utilities:
function openChat(anotherId) {    
    abonentId = anotherId;
    chatTitle.innerHTML = `Chat: ${myId} with ${abonentId}`;
    chatHistory.innerHTML = "";
    switchToMode('chat');
}

function hide(elem) {
    elem.style.display = 'none';
}

function show(elem) {
    elem.style.display = 'block';
}

function sendSignal(type,text) {
    signalsConnection.send(JSON.stringify({
        type, text, from: myId, to: abonentId
    }));
}

function sendSignalObj(obj) {
    obj.from = myId;
    obj.to = abonentId;
    signalsConnection.send(JSON.stringify(obj));
}

function switchToMode(m) {
    // TODO refactor this boilerplated code
    hide(errorMessage);
    mode = m;
    const loginPageSwitch = 'login'==mode ? show : hide;
    const callPageSwitch = 'call'==mode ? show : hide;
    const callingPageSwitch = 'calling'==mode ? show : hide;
    const callResponsePageSwitch = 'call-response'==mode ? show : hide;    
    const chatPageSwitch = 'chat'==mode ? show : hide;
    const fileTransferingPageSwitch = 'file-transfering'==mode ? show : hide;
    loginPageSwitch(loginPage);
    callPageSwitch(callPage);
    callingPageSwitch(callingPage);
    callResponsePageSwitch(callResponsePage);    
    chatPageSwitch(chatPage);
    fileTransferingPageSwitch(fileTransferingPage);
}

function raiseError(text) {
    errorMessage.innerHTML = text;
    show(errorMessage);
    console.error(text);
}

function isNotEmpty(input) {
    return input.value && input.value.length>0;
}

function toBase64(txt) {
    return btoa(txt);
}

function fromBase64(data, type) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i=0; i<bytes.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }  
    const isText = type.substring(0,4)=='text';
    if (isText) {
        return new TextDecoder('utf-8').decode(bytes);
    } else {
        return bytes.buffer;
    }
}
