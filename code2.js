const progress = document.getElementById("progress");
const timer = document.getElementById("timer");
const video = document.getElementById("video");
const button = document.getElementById("play");
const canvas = document.getElementById("canvas");
let ctx = canvas.getContext('2d');


let model, start, end, size, area

var time0 = performance.now()
var time1 = null
var fps = null
var FPS_accum = []
var valid_accum = []
var is_valid = 0

var constraints = { video: { frameRate: { ideal: 30, max: 60 },
                              facingMode: 'user' } };

const max_duration_counter = 10
var mytime = 0 
let interval_seconds = null

function setupCamera (){
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function (stream){
        video.srcObject = stream;
    })
    .catch (e => console.log(e));
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
        console.log(FPS_accum, valid_accum )
    }
}



const detectFaces = async () => {

    // Use model to estimate faces
    const returnTensors = false;
    const flipHorizontal = false;
    const annotateBoxes = true;
    const predictions =  await model.estimateFaces(video, returnTensors, flipHorizontal, annotateBoxes);

    
 
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.clearRect(0, 0, canvas.width , canvas.height);
    ctx.drawImage(video, 0,0, video.videoWidth, video.videoHeight);
    

    let topLef_box = [canvas.width/4, canvas.height/8];
    let size_box = [canvas.width/2, canvas.height - canvas.height/4];
    let bottomRight_box = [canvas.width/4+canvas.width/2, canvas.height/8+canvas.height - canvas.height/4];
    
    let area_box = (bottomRight_box[0] - topLef_box[0]) * (bottomRight_box[1] - topLef_box[1]);
    
    if (predictions.length == 1) {
        start = predictions[0].topLeft;
        end = predictions[0].bottomRight;
        size = [end[0] - start[0], end[1] - start[1]];
        area = (end[0]-start[0])*(end[1]-start[1]);

        // console.log(area_box, area);

        if (start[0]>= topLef_box[0] && start[1] >= topLef_box[1] && end[0] <= bottomRight_box[0] && end[1] <= bottomRight_box[1]) {
            
            if (area >= 0.2*area_box && area <= 0.55*area_box) {
                
                
                
                ctx.strokeStyle = "green"; 
                is_valid = 1
                // ctx.rect(start[0], start[1], size[0], size[1]);
        
                
            } else {
                ctx.strokeStyle = "red"; 
                is_valid = 0 
            }
            

        } else {
            ctx.strokeStyle = "red"; 
            is_valid = 0 
        }
        
        ctx.beginPath();
        ctx.lineWidth = 4
        ctx.rect(topLef_box[0], topLef_box[1], size_box[0],size_box[1]);
        ctx.stroke(); 
        
        
    }

    

    // if (predictions.length > 0 ) {
        
    //     start = predictions[0].topLeft;
    //     end = predictions[0].bottomRight;
    //     size = [end[0] - start[0], end[1] - start[1]];
    //     ctx.beginPath();
    //     ctx.rect(100, 100, 500, 300);
    //     ctx.stroke(); 
    //     ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    //     ctx.fillRect(start[0], start[1], size[0], size[1]);
    //     console.log(start[0], start[1], size[0], size[1]);

    //     time1 = performance.now();
    //     let fps = Math.round(1000/(time1-time0));
    //     time0 = time1;
    //     if (button.disabled == true) {
    //         FPS_accum.push(fps)
    //     }
    //     requestAnimationFrame(detectFaces);
    // };
    
    // await model.estimateFaces(video, returnTensors, flipHorizontal, annotateBoxes).then(function (predictions) {
    
    //     start = predictions[0].topLeft;
    //     end = predictions[0].bottomRight;
    //     size = [end[0] - start[0], end[1] - start[1]];
    //     ctx.beginPath();
    //     ctx.rect(start[0], start[1], size[0], size[1]);
    //     ctx.stroke(); 
    //     // ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    //     // ctx.fillRect(start[0], start[1], size[0], size[1]);
    //     console.log(start[0], start[1], size[0], size[1]);

    //     time1 = performance.now();
    //     let fps = Math.round(1000/(time1-time0));
    //     time0 = time1;
    //     if (button.disabled == true) {
    //         FPS_accum.push(fps)
    //     }
    //     // requestAnimationFrame(detectFaces);

        
    
    // })

    time1 = performance.now();
    let fps = Math.round(1000/(time1-time0));
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
    model = await blazeface.load();
    detectFaces();
    button.disabled = false
})

button.addEventListener("click", function() {
    FPS_accum = [];
    valid_accum = [];
    button.disabled  = true
    updateTimer()
    interval_seconds = setInterval(updateTimer, 1000)
})
// button.addEventListener("click", playPause)
// video.addEventListener("play", progressLoop);