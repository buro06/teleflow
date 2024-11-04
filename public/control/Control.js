const socket = io({
    ackTimeout: 100,
    retries: 10
});
//Cross browser load config from server
var serverInfo;
async function loadConfig() {
    try {
        // Fetch the config.json file
        console.log('Getting server config');
        const response = await fetch('/serverInfo.json');
        // Check if the request was successful
        if (!response.ok) throw new Error('Network response was not ok ' + response.statusText);
        // Parse the JSON
        const config = await response.json();
        // initialize the config
        serverInfo = config;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
    }
}
await loadConfig();

//Define constant elements
const versionText = document.getElementById('version');
const promptText = document.getElementById('promptText');
const prompter = document.getElementById('prompter');
const connectionDot = document.getElementById('connectionDot');
const scrollMutliplier = document.getElementById('scrollMultiplier');
const resetBtn = document.getElementById('restartBtn');

//define client specific info
const windowHeight = window.innerHeight;
var scrollMethod;

//Hide connection lost dot upon socket connection
socket.on("connect", () => {
    connectionDot.style.display = 'none';
});
//Show dot when connection to socket is lost
socket.on("disconnect", () => {
    connectionDot.style.display = 'inline-block';
});


//update server version
updateVersion();
checkScrollMethod();
updateScript();


//Fix prompter font size
let vw = window.innerWidth * 0.01;
document.documentElement.style.setProperty('--vw', `${vw}px`);

//Event listeners
restartBtn.addEventListener('click', resetScript);

function updateVersion() {
    var version = serverInfo.serverInfo[0].version;
    versionText.innerHTML = version;
}
function updateScript() {
    console.log('Loading script from server');
    $.get('/script.txt', function (data) {
        promptText.textContent = data;
    });
}


//Check scroll method and create event listners appropriately
function checkScrollMethod() {
    scrollMethod = serverInfo.serverInfo[0].scrollMethod;
    if (scrollMethod === "teleflow") {
        makeTeleflow();
    } else if (scrollMethod === "native") {
        makeNative();
    } else {
        scrollMethod = 'teleflow';
        console.error('Scroll method is configured incorrectly. Check server config. Using ' + scrollMethod + ' method as fallback');
        makeTeleflow();
    }
    function makeTeleflow() {
        console.log('Using scroll method: ' + scrollMethod);
        prompter.style.pointerEvents = 'none';
        prompter.style.scrollbarWidth = 'none';
        document.onkeydown = function (e) {
            handleControlPosition(e);
        }
    }
    function makeNative() {
        console.log('Using scroll method: ' + scrollMethod);
        scrollMutliplier.style.display = 'none';
        $("#scrollMultiplierLabel").css("display", "none");
        prompter.addEventListener('scroll', handleControlPosition)
    }
}

function handleControlPosition(e) {
    var offset;
    var scrollMultiplierValue = scrollMutliplier.value;
    if (e) {
        if (e.keyCode === 38) {
            offset = -scrollMultiplierValue * 25;
        } else if (e.keyCode === 40) {
            offset = scrollMultiplierValue * 25;
        } else offset = 0;
    } else offset = 0;
    var scrollPos = prompter.scrollTop + offset;
    sendControlPosition(offset);
    if (scrollMethod === 'teleflow') {
        scrollToLinear(prompter, scrollPos, 200);
    } else {
        //Native browser scroll will take care of scrolling
    }

}
function resetScript() {
    console.log('Resetting script');
    var top = 0;
    prompter.scrollTo(top, top);
    sendControlPosition(top);
}

var canSend = true;
function sendControlPosition(offset) {
    if (canSend) {
        const scrollTop = prompter.scrollTop + offset;
        const scrollMax = prompter.scrollHeight;
        console.log("Sending payload to server: ", scrollTop, scrollMax);
        socket.emit('controlPosition', {
            controlScrollTop: scrollTop,
            controlScrollMax: scrollMax
        });
        canSend = false;
        setTimeout(function () {
            canSend = true;
        }, 100)
    }
}

function scrollToLinear(a, c, e, d) {
    d || (d = linearEase);
    if (0 === a.scrollTop) {
        var b = a.scrollTop;
        ++a.scrollTop; a = b + 1 === a.scrollTop-- ? a : document.body
    }
    b = a.scrollTop; 0 >= e || ("object" === typeof b && (b = b.offsetTop),
        "object" === typeof c && (c = c.offsetTop), function (a, b, c, f, d, e, h) {
            function g() {
                0 > f || 1 < f || 0 >= d ? a.scrollTop = c : (a.scrollTop = b - (b - c) * h(f),
                    f += d * e, setTimeout(g, e))
            } g()
        }(a, b, c, 0, 1 / e, 20, d))
};
function linearEase(t) { return t; }