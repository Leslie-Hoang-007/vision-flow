import React, { useRef, useEffect, useState } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import './App.css';
import { createClient } from "@deepgram/sdk";
import { LiveTranscriptionEvents } from "@deepgram/sdk";
import Modal from './components/modal';
import Instructions from './components/instructions';

function App() {

  // VIDEO MAPPING
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [dBlendShapes, setDBlendShapes] = useState(null);
  let runningMode = "IMAGE";
  let webcamRunning = false;
  const videoWidth = 480;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [transcription, setTranscription] = useState('');
  const [site, setSite] = useState("https://www.google.com/search?igu=1");
  const [prevtranscription, setPrevtranscription] = useState('Search+for+something!'); // default search
  const [lastActionTime, setLastActionTime] = useState(0);// last scroll

  // default calibration
  const [up, setUp] = useState(0.1);
  const [down, setDown] = useState(0.5);
  const [left, setLeft] = useState(0.6);
  const [right, setRight] = useState(0.3);
  
  // Page State
  const [loading, setLoading] = useState(true);
  const [calibrate, setCalibrate] = useState(true);
  const [dirCal, setdirCal] = useState('Up');
  const [start, setStart] = useState(true);
  
  // Audio Transcription 
  const [live, setLive] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // const deepgram = createClient("KEY");
  const deepgram = createClient(process.env.REACT_APP_DEEPGRAM_KEY);

  // Modial properties
  const [modalOpen, setModalOpen] = useState(true);
  const close = () => setModalOpen(false);
  const open = () => setModalOpen(true);


  // Start Recording Voice and ask for permission
  const startRecording = async () => {
    setIsRecording(true);
    setStart(false);
    open();
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          console.log('GOT MIC');
          console.log({ stream });

          if (!MediaRecorder.isTypeSupported('audio/webm'))
            return alert('Browser not supported')
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
          })

          // make socket
          let origLive = deepgram.listen.live({ model: "nova" });

          // set socket
          setLive(origLive);

          // turn on an stream
          origLive.on(LiveTranscriptionEvents.Open, () => {
            mediaRecorder.addEventListener('dataavailable', (event) => {
              if (event.data.size > 0) {
                if (origLive.getReadyState() === 1) {// stream when socket is open
                  origLive.send(event.data);
                }
              }
            })
            mediaRecorder.start(250);// data avail every 1/4 second
          });

          // turn on and recieve
          origLive.on(LiveTranscriptionEvents.Transcript, (data) => {
            let results = data.channel.alternatives[0].transcript;
            if (results.length > 0) {
              console.log('recieved', results);
              setTranscription(prev => prev == "" ? results : prev + " " + results);
            }
          });

        });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setLoading(true);
    }
  };

  // Stops voice recording and changes iframe src
  const stopRecording = () => {
    setIsRecording(false);
    if (live && live.getReadyState() === 1) {
      live.finish();
      setLive(null);
    }
    let mutateString = transcription.replace(/ /g, "+");
    console.log('recieved mutated', mutateString);
    if (mutateString === "") {
      mutateString = prevtranscription;
    }
    setSite("https://www.google.com/search?igu=1&ei=&q=" + mutateString);
    setPrevtranscription(mutateString);
    setTranscription("");
    close();
  };


  useEffect(() => {
    async function createFaceLandmarker() {
      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode,
        numFaces: 1
      });
      setFaceLandmarker(landmarker);
    }

    // turn on landmarks
    createFaceLandmarker();
  }, []);

  // enables cam when landmarks is loaded
  useEffect(() => {
    if (faceLandmarker) {
      enableCam(); // Invoke enableCam right away
      setLoading(false);
    }
  }, [faceLandmarker]);


  // Enables Cam and videoRef
  const enableCam = async () => {
    if (!faceLandmarker) {
      console.log("Wait! faceLandmarker not loaded yet.");
      return;
    }

    // Retrieve Video Data
    try {
      navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
        videoRef.current.srcObject = stream;
        videoRef.current.addEventListener("loadeddata", predictWebcam);
      });
    } catch (error) {
      console.error('Error accessing camera and microphone:', error);
    }

    // TOGGLE RUNNING
    if (webcamRunning === true) {
      webcamRunning = false;
    } else {
      webcamRunning = true;
    }
  };

  const predictWebcam = async () => {


    // Set Output Video + Mask Data
    const radio = videoRef.current.videoHeight / videoRef.current.videoWidth;
    videoRef.current.style.width = videoWidth + "px";
    videoRef.current.style.height = videoWidth * radio + "px";
    canvasRef.current.style.width = videoWidth + "px";
    canvasRef.current.style.height = videoWidth * radio + "px";
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Set Running Mode
    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await faceLandmarker.setOptions({ runningMode: runningMode });
    }

    // UPDATE RESULTS
    let startTimeMs = performance.now();
    const results = await faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

    // SET FACIAL DATA FOR SCROLLING
    setDBlendShapes(results.faceBlendshapes);

    // Resuest animation
    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }

    // Draw Landmarks/FaceMask
    if (results.faceLandmarks) {
      const ctx = canvasRef.current.getContext("2d");
      const drawingUtils = new DrawingUtils(ctx);
      for (const landmarks of results.faceLandmarks) {
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_TESSELATION,
          { color: "#C0C0C070", lineWidth: 1 }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
          { color: "#FF3030" }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
          { color: "#FF3030" }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
          { color: "#30FF30" }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
          { color: "#30FF30" }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
          { color: "#E0E0E0" }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LIPS,
          { color: "#E0E0E0" }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
          { color: "#FF3030" }
        );
        drawingUtils.drawConnectors(
          landmarks,
          FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
          { color: "#30FF30" }
        );
      }
    }
  };



  const scrollU = (speed) => {
    const currentTime = Math.floor(new Date().getTime());
    setLastActionTime(currentTime);
    console.log("value", (speed));// IMPLEMNT FASTER SCROLLING LATTER
    let newSpeed;
    if (speed > 0) {
      newSpeed = 100// SCROLL DOWN
    } else {
      newSpeed = -100// SCROLL UP
    }
    window.scrollBy(0, newSpeed);
  }


  // RENDER DEGUGGIN DATA / AND HAS JSX SCROLLING LOGIC
  const render = () => {
    if (dBlendShapes?.[0]?.categories) {

      // PRINTING ALL BLENDEDSHAPES/LANDMARKDATA
      // const data = dBlendShapes[0].categories.map((shape) => (
      //   <div key={shape.displayName || shape.categoryName}>
      //     <li className="blend-shapes-item">
      //       <p className="blend-shapes-label">{shape.displayName || shape.categoryName}</p>
      //       {/* <span className="blend-shapes-value" style={{ width: `calc(${(+shape.score) * 100}% - 120px)` }}/> */}

      //       <p>        {(shape.score).toFixed(4)}</p>
      //     </li>
      //   </div>
      // ));


      // REVELENT DATA FOR BASIC OPPERATION
      return (
        <div>
          <li>{/* Left Eye Look Down*/}
            <p>{dBlendShapes[0].categories[11].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[11].score) * 100}% - 120px)` }} /> </p>
            <p>{dBlendShapes[0].categories[11].score}</p>
            {Math.floor(new Date().getTime()) > (lastActionTime + 250) && dBlendShapes[0].categories[11].score > down ? scrollU(dBlendShapes[0].categories[11].score) : null}
          </li>
          <li>{/* Right Eye Look Down*/}
            <p>{dBlendShapes[0].categories[12].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[12].score) * 100}% - 120px)` }} /> </p>
            <p>{dBlendShapes[0].categories[12].score}</p>
          </li>
          <li>{/* Left Eye Look Up*/}
            <p>{dBlendShapes[0].categories[17].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[17].score) * 100}% )` }} /> </p>
            <p>{dBlendShapes[0].categories[17].score}</p>
            {Math.floor(new Date().getTime()) > (lastActionTime + 250) && dBlendShapes[0].categories[17].score > up ? scrollU(-(dBlendShapes[0].categories[17].score * 10)) : null}
          </li>
          <li>{/* Right Eye Look up*/}
            <p>{dBlendShapes[0].categories[18].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[18].score) * 100}% )` }} /> </p>
            <p>{dBlendShapes[0].categories[18].score}</p>
          </li>
          <li>{/* In Left */}
            <p>{dBlendShapes[0].categories[13].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[13].score) * 100}% )` }} /> </p>
            <p>{dBlendShapes[0].categories[13].score}</p>
          </li>
          <li>{/* In Right */}
            <p>{dBlendShapes[0].categories[14].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[14].score) * 100}% )` }} /> </p>
            <p>{dBlendShapes[0].categories[14].score}</p>
          </li>
          <li>{/* Out Left */}
            <p>{dBlendShapes[0].categories[15].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[15].score) * 100}% )` }} /> </p>
            <p>{dBlendShapes[0].categories[15].score}</p>
            {isRecording === false && dBlendShapes[0].categories[15].score > left ? startRecording() : null}
          </li>
          <li>{/* Out Right */}
            <p>{dBlendShapes[0].categories[16].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[16].score) * 100}% )` }} /> </p>
            <p>{dBlendShapes[0].categories[16].score}</p>
            {isRecording === true && dBlendShapes[0].categories[16].score > right ? stopRecording() : null}
          </li>
        </div>
      )
    }
  };


  // HANDLE CALIBRATION PROTOCOL
  const calStat = (x) => {
    if (dBlendShapes?.[0]?.categories) {
      if (x == 'up') {
        console.log("Up Calibrate", dBlendShapes[0].categories[17].score)
        setUp(dBlendShapes[0].categories[17].score * 1.4);
        setdirCal('Down');
      } else if (x == 'down') {
        console.log("Down Calibrate", dBlendShapes[0].categories[11].score)
        setDown(dBlendShapes[0].categories[11].score * 1.4);
        setdirCal('Left');
      } else if (x == 'left') {
        console.log("Left Calibrate", dBlendShapes[0].categories[15].score)
        setLeft(dBlendShapes[0].categories[15].score * 1.4);
        setdirCal('Right');
      } else {
        console.log("Right Calibrate", dBlendShapes[0].categories[16].score)
        setRight(dBlendShapes[0].categories[16].score * 1.4);
        setCalibrate(false);
      }
    }
  }


  return (
    <div>

      {/* LOADING PAGE*/}
      <div className='loading-page' style={{ display: loading ? "block" : "none" }} >
        <h1>Loading...</h1>
        <h1>Please allow access to camera and microphone and refresh page.</h1>
      </div>

      {/* CALIBRATION PAGE*/}
      <div className="cal-container" style={{ display: calibrate ? "block" : "none" }} >
        {dirCal === 'Up' && <button className="cal upCal" onClick={() => calStat('up')}>Up claibrate</button>}
        {dirCal === 'Down' && <button className="cal downCal" onClick={() => calStat('down')}>Down claibrate</button>}
        {dirCal === 'Left' && <button className="cal leftCal" onClick={() => calStat('left')}>Left claibrate</button>}
        {dirCal === 'Right' && <button className="cal rightCal" onClick={() => calStat('right')}>Right claibrate</button>}
        <p>Look at the {dirCal} Button and Press to Calibrate</p>
      </div>



      {/* MAIN PAGE */}
      <div style={{ display: !calibrate ? "block" : "none" }} >
        <div>{start && <Instructions />}
        </div>
        <div>
          {modalOpen && <Modal data={transcription} state={start} />}
        </div>
        <iframe
          id="if1"
          width="100%"
          allowScriptAccess="always"
          height="1000px"
          src={site}
          frameBorder="0"
          allowFullScreen
          scrolling="no"
          style={{
            display: !modalOpen ? "block" : "none",
            position: 'reletative',
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            width: '100%',
            height: '5000px',
            border: 'none',
            margin: 0,
            padding: 0,
            zIndex: 999999,
          }}
        ></iframe>

      </div>


      {/* DEGUB DATA*/}
      <div className='debugStuff' style={{ display: 'none' }}>
        <div className='speach'>
          <h1>Speech Recognition Test</h1>
          <button onClick={startRecording} disabled={isRecording}>
            Start Recording
          </button>
          <button onClick={stopRecording} disabled={!isRecording}>
            Stop Recording
          </button>
          <div>
            <h2>Transcription Output</h2>
            <pre>{transcription}</pre>
          </div>
        </div>
        <section id="demos" className="invisible" style={{ display: 'block' }}>
          <h1>Face landmark detection using the MediaPipe FaceLandmarker task</h1>

          <div className="blend-shapes">
            <ul className="blend-shapes-list" id="image-blend-shapes"></ul>
          </div>

          <p>Hold your face in front of your webcam to get real-time face landmarker detection.</p>

          <span>{webcamRunning ? "DISABLE PREDICTIONS" : "ENABLE WEBCAM"}</span>

          <div style={{ position: "relative" }}>
            <video id="webcam" style={{ position: "reletative", left: "0px", top: "0px" }} ref={videoRef} autoPlay playsInline></video>
            <canvas className="output_canvas" id="output_canvas" style={{ position: "absolute", left: "0px", top: "0px" }} ref={canvasRef}></canvas>
          </div>
          <div className="blend-shapes">
            <ul className="blend-shapes-list" id="video-blend-shapes">
              {render()}
            </ul>
          </div>
        </section>
      </div>

    </div>
  );
}

export default App;
