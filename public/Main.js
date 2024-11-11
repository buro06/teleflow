const socket = io({
    ackTimeout: 1000,
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

//Define elements on page
const flipToggle = document.getElementById('flipToggle');
const prompter = document.getElementById('prompter');
const promptText = document.getElementById('promptText');
const cueArrow = document.getElementById('cueArrow');
const debugInfo = document.getElementById('debug');
const versionText = document.getElementById('version');
const connectionDot = document.getElementById('connectionDot');

//Hide connection lost dot upon socket connection
socket.on("connect", () => {
    connectionDot.style.display = 'none';
});
//Show dot when connection to socket is lost
socket.on("disconnect", () => {
    connectionDot.style.display = 'inline-block';
});

//define client-specific info
const windowHeight = window.innerHeight;
const updateIntervalSecs = serverInfo.serverInfo[0].updateIntervalSecs;
const scrollMethod = serverInfo.serverInfo[0].scrollMethod;


//Update server version
updateVersion();

//Try Wakelock request:
let wakeLock = null;

// Function that attempts to request a screen wake lock.
const requestWakeLock = async () => {
    try {
        wakeLock = await navigator.wakeLock.request();
        wakeLock.addEventListener('release', () => {
            console.log('Screen Wake Lock released:', wakeLock.released);
            debugInfo.innerHTML = "Screen Wake Lock: " + !wakeLock.released;
        });
        console.log('Screen Wake Lock released:', wakeLock.released);
        debugInfo.innerHTML = "Screen Wake Lock: " + !wakeLock.released;
    } catch (err) {
        console.error('Wakelock error: ' + err.name + ' ' + err.message);
    }
};

// Request a screen wake lock…
await requestWakeLock();

//FIX: Some browsers (ex: iOS) will only release a wakelock after the display is tapped.
//      Add event listener for screen tap
document.addEventListener('click', () => {     
    requestWakeLock()
})

//update script from server on load and continue on interval
updateScript();
setInterval(updateScript, serverInfo.serverInfo[0].updateIntervalSecs * 1000);

//Fix prompter font size
let vw = window.innerWidth * 0.01;
document.documentElement.style.setProperty('--vw', `${vw}px`);

//event listeners
flipToggle.addEventListener("click", toggleFlipScreen);


//Handle payload from server event
socket.on('payload', (data) => {
    console.log("Received payload from server:", data);
    var { controlScrollTop, controlScrollMax } = data;
    var clientScrollMax = prompter.scrollHeight;
    var scrollRatio = clientScrollMax / controlScrollMax;
    var scrollPos = controlScrollTop * scrollRatio;
    if (scrollMethod === "teleflow") {
        scrollToLinear(prompter, scrollPos, 200);
    } else if (scrollMethod === "native") {
        prompter.scrollTo({
            top: scrollPos,
            behavior: "smooth",
        });
    }
});

//Check if prompter was flipped last session on load
var isFlipped = (checkCookieValue('flipped') === 'true');
if (isFlipped) flipScreen();



function updateVersion() {
    var version = serverInfo.serverInfo[0].version;
    versionText.innerHTML = version;
}
function updateScript() {
    console.log('Loading script from server per config interval');
    $.get('/script.txt', function (data) {
        promptText.textContent = data;
    });
}

function checkCookieValue(cookie) {
    var cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith(cookie + "="))
        ?.split("=")[1];
    return cookieValue;
}
function toggleFlipScreen() {
    if (isFlipped) unFlipScreen(); else flipScreen();
}
function flipScreen() {
    console.log("Flipping screen to true");
    document.cookie = "flipped=true";
    isFlipped = true;
    prompter.style.webkitTransform = 'scaleX(-1)'
    cueArrow.style.left = '95%';
    cueArrow.style.borderLeft = '5vw';
    cueArrow.style.borderRight = '5vw solid green';
}
function unFlipScreen() {
    console.log("Flipping screen to false");
    document.cookie = "flipped=false";
    isFlipped = false;
    prompter.style.webkitTransform = 'scaleX(1)';
    cueArrow.style.left = '0%';
    cueArrow.style.borderLeft = '5vw solid green';
    cueArrow.style.borderRight = '5vw';
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