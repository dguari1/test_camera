const progress = document.getElementById("progress");
const timer = document.getElementById("timer");
const video = document.getElementById("video");
const button = document.getElementById("play");
const selector = document.getElementById("select")

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
var is_valid 
var k = 0
var frame_skipper = 0

let currentDevice
let currentStream

let isRunning = true 

var videoConstraints =  { frameRate: { ideal: 30, max: 60 },
                          width: 1280, //{ min: 640, ideal: 1280, max: 1280 },
                          height: 720, // { min: 480, ideal: 720, max: 720 },
                          facingMode: "user" ,} ;

const max_duration_counter = 5
var mytime = 0 
let interval_seconds = null


var outputTest = {  device_Id : null,
                    frame_width : null,
                    frame_height : null,
                    FPS_Processor : null,
                    FPS_camera : null,
                    headinFrame : null,
                }

// function to compute the average
const average = (array) => array.reduce((a, b) => a + b) / array.length;



//Find available cameras and fill the selector
function gotDevices(mediaDevices) {
    select.innerHTML = '';
    select.appendChild(document.createElement('option'));
    let count = 1;
    mediaDevices.forEach(mediaDevice => {
      if (mediaDevice.kind === 'videoinput') {
        const option = document.createElement('option');
        option.value = mediaDevice.deviceId;
        const label = mediaDevice.label || `Camera ${count++}`;
        const textNode = document.createTextNode(label);
        option.appendChild(textNode);
        select.appendChild(option);
      }

    });
    for(var i = 0; i < selector.length; i++) {
        if (selector[i].innerHTML == '') {

            selector.removeChild(selector[i]);
            i--;
        }
    }          

  }
  
// set up camera with default device 
function setupCamera (){

    const constraints = {
        video: videoConstraints,
        audio: false
      };

    navigator.mediaDevices.getUserMedia(constraints)
    .then(function (stream){
        currentStream = stream
        const videoTracks = stream.getVideoTracks();
        currentDevice = videoTracks[0].label

        video.srcObject = stream;
        for(var i = 0; i < selector.length; i++) {
            if (currentDevice == selector[i].innerHTML) {

                selector[i].selected = true
            }          
        }       
    })
    .catch (e => console.log(e));
}

// Stop media stream if there is an error
function stopMediaTracks(stream) {
    stream.getTracks().forEach(track => {
      track.stop();
    });
  }

// Allow user to change camera if multiple are available 
selector.addEventListener("change", event => {

    if (typeof currentStream !== 'undefined') {
        stopMediaTracks(currentStream);
      }


    videoConstraints.deviceId = { exact: selector.value };
    workerModelIsReady = false
    setupCamera()
 
    // const constraints = {
    //   video: videoConstraints,
    //   audio: false
    // };
    // navigator.mediaDevices
    //   .getUserMedia(constraints)
    //   .then(stream => {
    //     currentStream = stream;
    //     video.srcObject = stream;
    //     return navigator.mediaDevices.enumerateDevices();
    //   })
    //   .then(gotDevices)
    //   .catch(error => {
    //     console.error(error);
    //   });
  });

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
                    button.disabled = false
                }
            }
            
            if (typeof event.data.valid !== 'undefined') {
                // console.log("From main " + event.data.valid)
                is_valid = event.data.valid
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
        // alert("FPS = " + Math.round((1/average(FPS_accum))*1000) )
        // console.log(valid_accum)
        // // alert("FPS = " + (1/average(FPS_accum))*1000 + " | In Frame =" + average(valid_accum)*100);

        outputTest.device_Id = currentStream.getVideoTracks()[0].getSettings().deviceId
        outputTest.FPS_camera = currentStream.getVideoTracks()[0].getSettings().frameRate
        outputTest.frame_height = currentStream.getVideoTracks()[0].getSettings().height
        outputTest.frame_width = currentStream.getVideoTracks()[0].getSettings().width

        outputTest.FPS_Processor = Math.round((1/average(FPS_accum))*1000)
        outputTest.headinFrame = Math.round(average(valid_accum)*100)

   
        localStorage.setItem('OutputVideoTest', JSON.stringify(outputTest))
        location.replace("./table.html")

    }
}



const detectFaces = async () => {

    local_canvas.width = video.videoWidth;
    local_canvas.height = video.videoHeight;
    local_ctx.clearRect(0, 0, local_canvas.width, local_canvas.height);
    local_ctx.drawImage(video, 0,0, local_canvas.width, local_canvas.height);
    const imgData = local_ctx.getImageData(0, 0, local_canvas.width, local_canvas.height)

    if (frame_skipper == 5) {
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
        valid_accum.push(+is_valid) // keep the number 1-> true | 0-> false 
        }


    if (isRunning){
        window.requestAnimationFrame(detectFaces);
    }


}

navigator.mediaDevices.enumerateDevices().then(gotDevices);
setupCamera();
video.addEventListener("loadeddata", async () => {
    button.disabled = true
    setupModel();
    detectFaces()
    
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