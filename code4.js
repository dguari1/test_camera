const progress = document.getElementById("progress");
const timer = document.getElementById("timer");
const video = document.getElementById("video");
const button = document.getElementById("play");

const canvas = document.getElementById("canvas");
const offscreenCanvas = canvas.transferControlToOffscreen();

const local_canvas = document.createElement('canvas')
const local_ctx = local_canvas.getContext('2d')

let webWorker = null;
let workerModelIsReady = false

let start, end, size, area

var time0 = performance.now()
var time1 = null
var fps = null
var FPS_accum = []
var valid_accum = []
var is_valid = 0
var k = 0
var frame_skipper = 0

var constraints = { video: { frameRate: { ideal: 30, max: 60 },
                              width: 640, //{ min: 640, ideal: 1280, max: 1280 },
                              height: 360, // { min: 480, ideal: 720, max: 720 },
                              facingMode: "user" ,} };

const max_duration_counter = 5
var mytime = 0 
let interval_seconds = null

// function to compute the average
const average = (array) => array.reduce((a, b) => a + b) / array.length;

function setupCamera (){
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function (stream){
        video.srcObject = stream;
    })
    .catch (e => console.log(e));
}

const setupModel = async function() {

    if (window.Worker) {
        // create webworker
        webWorker = new Worker('worker_th2.js')
        // send canvas
        webWorker.postMessage({msg: 'init', canvas: offscreenCanvas}, [offscreenCanvas]);
        
        webWorker.onmessage = event => {
            
            if (!workerModelIsReady) {

                if (event.data.modelIsReady) {
                    workerModelIsReady = true
                }
            }
            
            if (event.data.is_valid) {
                is_valid = event.data.is_valid
            }
            
            }
        }
    }


function updateTimer () {
    progress.value = Math.round(((mytime+1)/max_duration_counter)*100);
    timer.innerHTML = mytime + " seconds" ;
    mytime +=1
    
    if (mytime == max_duration_counter+1) {
        mytime = 0
        clearInterval(interval_seconds)
        button.disabled = false
        progress.value = Math.round((mytime/max_duration_counter)*100);
        timer.innerHTML = mytime + " seconds" ;
        alert("FPS = " + (1/average(FPS_accum))*1000 )
        // alert("FPS = " + (1/average(FPS_accum))*1000 + " | In Frame =" + average(valid_accum)*100);


    }
}



const detectFaces = async () => {

    local_canvas.width = video.videoWidth;
    local_canvas.height = video.videoHeight;
    local_ctx.clearRect(0, 0, local_canvas.width, local_canvas.height);
    local_ctx.drawImage(video, 0,0, local_canvas.width, local_canvas.height);
    const imgData = local_ctx.getImageData(0, 0, local_canvas.width, local_canvas.height)

    if (frame_skipper == 3) {
        if (workerModelIsReady) {
            webWorker.postMessage({
                "msg": "frame",
                "data": imgData.data.buffer,
                "width": local_canvas.width,
                "height": local_canvas.height,
            }, [imgData.data.buffer])
        }
        frame_skipper = 0
    }
    
    frame_skipper+=1

    time1 = performance.now();
    fps = Math.round((time1-time0));
    time0 = time1;
    if (button.disabled == true) {
        FPS_accum.push(fps)
        valid_accum.push(is_valid)
        }

    window.requestAnimationFrame(detectFaces);


}


setupCamera();
video.addEventListener("loadeddata", async () => {
    button.disabled = true
    setupModel();
    detectFaces()
    button.disabled = false
})

button.addEventListener("click", function() {
    FPS_accum = [];
    valid_accum = [];
    button.disabled  = true
    updateTimer()
    interval_seconds = setInterval(updateTimer, 1000)
})

window.onbeforeunload = function(){
    webWorker.terminate();
 }
// button.addEventListener("click", playPause)
// video.addEventListener("play", progressLoop);