const socket = io({
    ackTimeout: 1000,
    retries: 10
});
import serverInfo from '/serverInfo.json' with { type: "json" };

//Define elements on page
const versionText = document.getElementById('version');
const submitBtn = document.getElementById('submit');
const scriptInput = document.getElementById('scriptInput');

//update server version on page load
var version = serverInfo.serverInfo[0].version;
versionText.innerHTML = version;

submitBtn.addEventListener('click', uploadScript);

function uploadScript() {
    var scriptValue = scriptInput.value;
    if(scriptValue) {
        console.log('Uploading script:\n'+scriptValue);
        socket.emit('upload', scriptValue);
        alert('The script was written to the server OK');
        window.location.href = '/control';
    } else {
        alert('Please paste a script before submitting');
    }
    
}


