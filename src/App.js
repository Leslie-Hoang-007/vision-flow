import React, { useRef, useEffect, useState } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

import './App.css';

function App() {
  const [faceLandmarker, setFaceLandmarker] = useState(null);
  const [dBlendShapes, setDBlendShapes] = useState(null);
  let runningMode = "IMAGE";
  let enableWebcamButton;
  let webcamRunning = false;
  const videoWidth = 480;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    // Before we can use FaceLandmarker class, we must wait for it to finish loading.
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
    createFaceLandmarker();

  }, []);

  useEffect(() => {
    if (faceLandmarker) {
      enableCam(); // Invoke enableCam right away
    }
  }, [faceLandmarker]);

  const enableCam = async (event) => {
    if (!faceLandmarker) {
      console.log("Wait! faceLandmarker not loaded yet.");
      return;
    }

    if (webcamRunning === true) {
      webcamRunning = false;
      // enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    } else {
      webcamRunning = true;
      // enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }

    const constraints = {
      video: true
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      videoRef.current.srcObject = stream;
      videoRef.current.addEventListener("loadeddata", predictWebcam);
    });
  };

  const predictWebcam = async () => {
    const radio = videoRef.current.videoHeight / videoRef.current.videoWidth;
    videoRef.current.style.width = videoWidth + "px";
    videoRef.current.style.height = videoWidth * radio + "px";
    canvasRef.current.style.width = videoWidth + "px";
    canvasRef.current.style.height = videoWidth * radio + "px";
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    if (runningMode === "IMAGE") {
      runningMode = "VIDEO";
      await faceLandmarker.setOptions({ runningMode: runningMode });
    }

    let startTimeMs = performance.now();
    const results = await faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

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
      drawBlendShapes(canvasRef.current, results.faceBlendshapes);
    }

    if (webcamRunning === true) {
      window.requestAnimationFrame(predictWebcam);
    }
  };

  const drawBlendShapes = (el, blendShapes) => {
    if (!blendShapes.length) {
      return;
    }

    let htmlMaker = "";
    blendShapes[0].categories.map((shape) => {
      htmlMaker += `
      <li class="blend-shapes-item">
      <p class="blend-shapes-label">${shape.displayName || shape.categoryName}</p>
      <p class="blend-shapes-value">${(+shape.score).toFixed(4)}</p>
      </li>
      `;
    });

    setDBlendShapes(blendShapes);
  };

  const [lastActionTime, setLastActionTime] = useState(0);


  // const downArrowEvent = new KeyboardEvent('keydown', {
  //   key: 'ArrowDown',
  //   code: 'ArrowDown',
  //   keyCode: 40,
  //   which: 40,
  // });

  const dispatchDownArrowEvent = () => {
    const currentTime = Math.floor(new Date().getTime());
    setLastActionTime(currentTime);
    // document.dispatchEvent(downArrowEvent);
    console.log("down");
    scrollDown();
    const iframe = document.getElementById('if1'); // Replace 'if1' with the actual ID of your iframe
    // iframe.contents().scrollTop(438);
    // iframe.contentWindow.document.dispatchEvent(downArrowEvent);
    // iframe.contentWindow.document.scrollTop(123);// workd but denied
  };

  const scrollDown = () => {
    window.scrollBy(0, 100); // Adjust the value based on how much you want to scroll down
  };

  const dispatchUpArrowEvent = () => {
    const currentTime = Math.floor(new Date().getTime());
    setLastActionTime(currentTime);
    // document.dispatchEvent(downArrowEvent);
    console.log("up");
    scrollUp();
  };

  
  const scrollUp = () => {
    window.scrollBy(0, -100); 
  };

  const render = () => {
    if (dBlendShapes != null) {
      // const data = dBlendShapes[0].categories.map((shape) => (
      //   <div key={shape.displayName || shape.categoryName}>
      //     <li className="blend-shapes-item">
      //       <p className="blend-shapes-label">{shape.displayName || shape.categoryName}</p>
      //       {/* <span className="blend-shapes-value" style={{ width: `calc(${(+shape.score) * 100}% - 120px)` }}/> */}

      //       <p>        {(shape.score).toFixed(4)}</p>
      //     </li>
      //   </div>
      // ));


      const data = () => {

        return (
          <div>
            <li>
              <p>{dBlendShapes[0].categories[11].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[11].score) * 100}% - 120px)` }} /> </p>
              <p>{dBlendShapes[0].categories[11].score}</p>
              {Math.floor(new Date().getTime()) > (lastActionTime + 1000) && dBlendShapes[0].categories[11].score > 0.4 ? dispatchDownArrowEvent() : ""}
            </li>
            <li>
              <p>{dBlendShapes[0].categories[12].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[12].score) * 100}% - 120px)` }} /> </p>
              <p>{dBlendShapes[0].categories[12].score}</p>
            </li>
            <li>
              <p>{dBlendShapes[0].categories[17].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[17].score) * 100}% )` }} /> </p>
              <p>{dBlendShapes[0].categories[17].score}</p>
              {Math.floor(new Date().getTime()) > (lastActionTime + 1000) && dBlendShapes[0].categories[17].score > 0.04 ? dispatchUpArrowEvent() : ""}
            </li>
            <li>
              <p>{dBlendShapes[0].categories[18].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[18].score) * 100}% )` }} /> </p>
              <p>{dBlendShapes[0].categories[18].score}</p>
            </li>
          </div>
        )
      }
      // console.log(dBlendShapes[0].categories[11].categoryName);
      // console.log(dBlendShapes[0].categories[12].categoryName);
      return (
        <div>
          {data()}
        </div>
      );
    }
  };



  return (
    <div>
      <h1>Face landmark detection using the MediaPipe FaceLandmarker task</h1>

      <section id="demos" className="invisible" style={{ display: 'none' }}>

        <div className="blend-shapes">
          <ul className="blend-shapes-list" id="image-blend-shapes"></ul>
        </div>

        <p>Hold your face in front of your webcam to get real-time face landmarker detection.</p>
        <button id="webcamButton" className="mdc-button mdc-button--raised" onClick={enableCam}>
          <span className="mdc-button__ripple"></span>
          <span className="mdc-button__label">{webcamRunning ? "DISABLE PREDICTIONS" : "ENABLE WEBCAM"}</span>
        </button>

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
      <iframe
        id="if1"
        width="100%"
        allowScriptAccess="always"
        height="1000px"
        src="https://www.google.com/search?igu=1"
        frameBorder="0"
        allowFullScreen
        scrolling="no"
        style={{
          position: 'absolute',
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
  );
}
// https://www.google.com/search?igu=1&ei=&q=YOUR+WORD
// https://www.google.com/search?igu=1
export default App;
