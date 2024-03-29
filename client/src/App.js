import React, { useRef, useEffect, useState } from 'react';
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import './App.css';
import { createClient } from "@deepgram/sdk";
import { LiveTranscriptionEvents } from "@deepgram/sdk";
import Modal from './components/modal';
import Instructions from './components/instructions';

function App() {

  // Video Landmarks Mapping
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
  // const [up, setUp] = useState(0.065);
  // const [down, setDown] = useState(0.5);
  const [up, setUp] = useState(0.08);
  const [down, setDown] = useState(0.53);
  const [left, setLeft] = useState(0.6);
  const [right, setRight] = useState(0.3);

  // Page State
  const [loading, setLoading] = useState(true);// is loding?
  const [calibrate, setCalibrate] = useState(false);// turn on calibrate page
  const [dirCal, setdirCal] = useState('Up');// current direction to calibrate
  const [start, setStart] = useState(true);// toggle active to glow ehrn false
  const [doneSetup, setDoneSetup] = useState(false);// finished calibrating
  const [searchPrompt, setSearchPrompt] = useState(null);// text to direct used to speak on search page

  // Audio Transcription 
  const [live, setLive] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // const deepgram = createClient("KEY");
  const deepgram = createClient(process.env.REACT_APP_DEEPGRAM_KEY);

  // Search modual properties
  const [modalOpen, setModalOpen] = useState(true);
  const close = () => setModalOpen(false);
  const open = () => setModalOpen(true);

  // slow blink detection
  const [blinkCount, setBlinkCount] = useState(0);

  // Vertical eye acceleration
  const [t1, setT1] = useState(new Date().getDate / 1000);
  const [t2, setT2] = useState(new Date().getDate / 1000);
  const [y1, setY1] = useState(0);
  const [y2, setY2] = useState(0);
  const [t3, setT3] = useState(new Date().getDate / 1000);
  const [t4, setT4] = useState(new Date().getDate / 1000);
  const [y3, setY3] = useState(0);
  const [y4, setY4] = useState(0);


  // normal blink
  const [blink, setBlink] = useState(false);
  const [blinkTime, setBlinkTime] = useState(new Date().getTime() / 1000);



  const [max, setMax] = useState(0);
  const [min, setMin] = useState(0);


  // if (min == 0) {
  //   setMin(rightBlink);
  // }
  // if (rightBlink > max) {
  //   setMax(rightBlink);
  //   console.log('Max', rightBlink);

  // }
  // if (rightBlink < min) {
  //   setMin(rightBlink);
  //   console.log('Min', rightBlink);
  // }


  const [flag, setFlag] = useState(false);
  const [flagTime, setFlagTime] = useState(new Date().getTime() / 1000);

  const [downAcel, setDownAcel] = useState(0);

  useEffect(() => {

    if (dBlendShapes?.[0]?.categories) {
      const leftDown = dBlendShapes[0]?.categories[11]?.score;
      const rightDown = dBlendShapes[0]?.categories[12]?.score;
      const rightEyeIn = dBlendShapes[0]?.categories[14]?.score;
      const leftEyeOut = dBlendShapes[0]?.categories[13]?.score;
      const leftBlink = dBlendShapes[0]?.categories[9]?.score;
      const rightBlink = dBlendShapes[0]?.categories[10]?.score;



      if (
        leftDown > 0.6 &&
        rightDown > 0.6 &&
        ((leftBlink > 0.6 && rightBlink > 0.6) || (leftBlink > 0.59 && rightBlink > 0.6) || (leftBlink > 0.6 && rightBlink > 0.5))
        && !blink
        && (new Date().getTime() / 1000 > (flagTime + .2))// time sice last scroll
        && ((new Date().getTime() / 1000) > (blinkTime + 1))// time inbetween blinks
        && ((new Date().getTime()) > (lastActionTime + 200))// time between blinks and scroll. looking down if very similar to a blink based on values
      ) {
        // console.log("leftBlink", leftBlink)
        // console.log("rightBlink", rightBlink)
        // console.log("leftDown", leftDown)
        // console.log("rightDown", rightDown)
        // console.log("downAcel", downAcel)
        setBlink(true);
        setBlinkTime(new Date().getTime() / 1000);
        console.log("blink @ ", blinkTime);
      }

      if (
        blink &&
        leftDown <= 0.5 &&
        rightDown <= 0.5 &&
        leftBlink <= 0.5 &&
        rightBlink <= 0.5 &&
        ((new Date().getTime() / 1000) > (blinkTime + .9))// time to unblink

      ) {
        setBlinkTime(new Date().getTime() / 1000);
        setBlink(false);
        console.log("unblink @ ", blinkTime);
      }

    }
  }, [blink, dBlendShapes, blinkTime, min, max, downAcel, lastActionTime, flag, flagTime]);

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

  // detect slow blink when page loads
  useEffect(() => {
    if (!doneSetup) {
      isBlink();// slow blink detection
    }
  }, [dBlendShapes]);



  // update t1 + y1 Update
  useEffect(() => {

    const acelTimer = setInterval(() => {
      setT1(new Date().getTime() / 1000);
      setT3(new Date().getTime() / 1000);
      if (dBlendShapes != null) {
        setY1(dBlendShapes[0]?.categories[11]?.score)
        setY3(dBlendShapes[0]?.categories[17]?.score)
      }
    }, 500);

    return () => {
      clearInterval(acelTimer);
    };


  }, [t1, y1, t3, y3]);
  // update t2 + y2 Update
  useEffect(() => {


    if (dBlendShapes != null && doneSetup) {
      if (!blink && doneSetup && dBlendShapes[0]?.categories[17]?.score > up) {
        scrollU(-(dBlendShapes[0]?.categories[17]?.score * 10))// up
        setFlagTime(new Date().getTime() / 1000);

      }
      if (!blink && doneSetup && dBlendShapes[0]?.categories[11]?.score > down) {
        scrollU(dBlendShapes[0]?.categories[11]?.score)// down
        setFlagTime(new Date().getTime() / 1000);

      }
    }


    const acelTimer = setInterval(() => {
      setT2(new Date().getTime() / 1000);
      setT4(new Date().getTime() / 1000);
      if (dBlendShapes != null && doneSetup) {
        setY2(dBlendShapes[0]?.categories[11]?.score)// down score
        setY4(dBlendShapes[0]?.categories[17]?.score)// up score
        if (
          y2 != null && y2 != undefined && y1 != null && y1 != undefined && y1 != 0 && y2 != 0 && t1 != NaN && t2 != NaN && t1 != t2
        ) {
          const acel = (y2 - y1) / (t2 - t1);

          setDownAcel(acel);
        }
        // accelerated down scroll if orginating form center of screen
        if (!blink && y2 != null && y2 != undefined && y1 != null && y1 != undefined && y1 != 0 && y2 != 0 && t1 != NaN && t2 != NaN && t1 != t2) {
          const acceleration = (y2 - y1) / (t2 - t1);

          // if (min ==0){
          //   setMin(y2);
          // }
          // if (y2>max){
          //   setMax(y2);
          //   console.log('Max',y2);

          // }
          // if (y2<min){
          //   setMin(acceleration);
          //   console.log('Min',y2);
          // }

          if (!blink && acceleration > 1) {
            if (y2 > 0.38) {// prevents downward acceleration after tooking up and returning to center
              scrollA(1);// down
              console.log("true down acceleration @ ", acceleration);
              console.log("y Down position", y2)
              console.log("down");
              setFlagTime(new Date().getTime() / 1000);
            }
          }
        }
        // Accelerated Up scroll ### Difficult to use
        if (!blink && y4 != null && y4 != undefined && y3 != null && y3 != undefined && y3 != 0 && y4 != 0 && t3 != NaN && t4 != NaN && t3 != t4) {
          const acceleration = (y4 - y3) / (t4 - t3);
          if (acceleration > 0.01) {

            if (y4 > 0.13) {
              console.log("y value when scrolling up", y4);
              console.log("Up Acceleration", acceleration);

              scrollA(-1);// up
            }

          }
        }
      }
    }, 500 / 3);
    return () => {
      clearInterval(acelTimer);
    };
  }, [t2, y2, t4, y4, blink, min, max, blinkTime, doneSetup, downAcel, flag, flagTime]);




  // Scrolling handler for acceleration
  const scrollA = (speed) => {
    const currentTime = Math.floor(new Date().getTime());
    setLastActionTime(currentTime);
    let newSpeed;
    if (speed > 0) {
      console.log("Accelerated down scoll")
      newSpeed = 50// SCROLL DOWN
    } else {
      console.log("Accelerated up scoll")
      newSpeed = -50// SCROLL UP
    }
    window.scrollBy(0, newSpeed);
  }

  // ### VIDEO ###
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


  // Set Webcam > Server > Mask Data > Display
  const predictWebcam = async () => {
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


  let blinkTimeout;
  // Blink detection
  const isBlink = async () => {
    if (dBlendShapes?.[0]?.categories) {
      const leftDown = dBlendShapes[0].categories[11].score;
      const rightDown = dBlendShapes[0].categories[12].score;
      const rightEyeIn = dBlendShapes[0].categories[14].score;
      const leftEyeOut = dBlendShapes[0].categories[13].score;
      const leftBlink = dBlendShapes[0].categories[9].score;
      const rightBlink = dBlendShapes[0].categories[10].score;
      let blink;

      if (
        leftDown > 0.5 &&
        rightDown > 0.5 &&
        leftBlink > 0.5 &&
        rightBlink > 0.5
      ) {
        console.log("Blink");
        blink = true;
      }

      if (blink) {
        // increment blink count
        setBlinkCount((prevCount) => prevCount + 1);
        blink = false;

        // reset count .5s
        clearTimeout(blinkTimeout);
        blinkTimeout = setTimeout(() => {
          setBlinkCount(0);
        }, 250);
      }

      if (blinkCount === 1) {
        console.log("Regular BLINK!!");
      } else if (blinkCount > 5) {// 5 best or online 6 best for development
        console.log("Slow BLINK!!");
        setDoneSetup(true);
      }
    }
  };



  // Scrolling handler
  const scrollU = (speed) => {
    const currentTime = Math.floor(new Date().getTime());
    setLastActionTime(currentTime);
    console.log("USCROLL", (speed));// IMPLEMNT FASTER SCROLLING LATTER
    let newSpeed;
    if (speed > 0) {
      newSpeed = 25// SCROLL DOWN
    } else {
      newSpeed = -25// SCROLL UP
    }
    window.scrollBy(0, newSpeed);
  }

  // RENDER DEGUGGIN DATA / AND HAS JSX SCROLLING LOGIC
  const render = () => {
    if (dBlendShapes?.[0]?.categories) {

      // // PRINTING ALL BLENDEDSHAPES/LANDMARKDATA
      const data2 = dBlendShapes[0].categories.map((shape) => (
        <div key={shape.displayName || shape.categoryName}>
          <li className="blend-shapes-item">
            <p className="blend-shapes-label">{shape.displayName || shape.categoryName}</p>
            <span className="blend-shapes-value" style={{ width: `calc(${(+shape.score) * 100}% - 120px)` }} />

            <p>{(shape.score).toFixed(4)}</p>
          </li>
        </div>
      ));
      const data = () => {
        return (
          <div>
            <li>{/* Left Eye Look Down*/}
              <p>{dBlendShapes[0].categories[11].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[11].score) * 100}% - 120px)` }} /> </p>
              <p>{dBlendShapes[0].categories[11].score}</p>
              {/* Scroll BOX OUTSIDE */}
              {/* {!blink && doneSetup && Math.floor(new Date().getTime()) > (lastActionTime + 250) && dBlendShapes[0].categories[11].score > down ? scrollU(dBlendShapes[0].categories[11].score) : null} */}
            </li>
            <li>{/* Right Eye Look Down*/}
              <p>{dBlendShapes[0].categories[12].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[12].score) * 100}% - 120px)` }} /> </p>
              <p>{dBlendShapes[0].categories[12].score}</p>
            </li>
            <li>{/* Left Eye Look Up*/}
              <p>{dBlendShapes[0].categories[17].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[17].score) * 100}% )` }} /> </p>
              <p>{dBlendShapes[0].categories[17].score}</p>
              {/* Scroll BOX OUTSIDE */}
              {/* {!blink && doneSetup && Math.floor(new Date().getTime()) > (lastActionTime + 250) && dBlendShapes[0].categories[17].score > up ? scrollU(-(dBlendShapes[0].categories[17].score * 10)) : null} */}
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
              {doneSetup === true && isRecording === false && dBlendShapes[0].categories[15].score > left ? startRecording() : null}
            </li>
            <li>{/* Out Right */}
              <p>{dBlendShapes[0].categories[16].categoryName} <span className="blend-shapes-value" style={{ width: `calc(${(dBlendShapes[0].categories[16].score) * 100}% )` }} /> </p>
              <p>{dBlendShapes[0].categories[16].score}</p>
              {isRecording === true && dBlendShapes[0].categories[16].score > right ? stopRecording() : null}
            </li>
          </div>)
      }
      // REVELENT DATA FOR BASIC OPPERATION
      return (
        <div>
          {data()}
        </div>
      )
    }
  };


  // Handel Calibration Screen Box
  const calStat = (x) => {
    if (dBlendShapes?.[0]?.categories) {
      if (x == 'up') {
        console.log("Up Calibrate", dBlendShapes[0].categories[17].score * 2)
        // setUp(dBlendShapes[0].categories[17].score * 1.4);
        setUp(dBlendShapes[0].categories[17].score * 2);
        setdirCal('Down');
      } else if (x == 'down') {
        console.log("Down Calibrate", dBlendShapes[0].categories[11].score * 1.1)
        // setDown(dBlendShapes[0].categories[11].score * 1.3);
        setDown(dBlendShapes[0].categories[11].score * 1.1);
        setdirCal('Left');
      } else if (x == 'left') {
        console.log("Left Calibrate", dBlendShapes[0].categories[15].score * 1.5)
        setLeft(dBlendShapes[0].categories[15].score * 1.5);
        setdirCal('Right');
      } else {
        console.log("Right Calibrate", dBlendShapes[0].categories[16].score * 1.5)
        setRight(dBlendShapes[0].categories[16].score * 1.5);
        setCalibrate(false);
        setDoneSetup(true);
      }
    }
  }



  // ### VOICE ###
  // Start Recording Voice and ask for permission
  const startRecording = async () => {
    if (start) {
      setStart(false);
    }
    if (searchPrompt == null) {
      setSearchPrompt(true);
    }
    setIsRecording(true);
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
    if (searchPrompt == true) {
      setSearchPrompt(false);
    }
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


  return (
    <div>

      {/* LOADING PAGE*/}
      <div className='loading-page' style={{ display: loading ? "block" : "none" }} >
        <h1>Loading...</h1>
        <h1>Please allow access to camera and microphone and refresh page.</h1>
      </div>


      {/* BODY */}
      <div style={{ display: !loading ? "block" : "none" }} >


        {/* CALIBRATION PAGE*/}
        <div className="cal-container" style={{ display: calibrate ? "block" : "none" }} >
          {dirCal === 'Up' && <button className="cal upCal" onClick={() => calStat('up')}>Up claibrate</button>}
          {dirCal === 'Down' && <button className="cal downCal" onClick={() => calStat('down')}>Down claibrate</button>}
          {dirCal === 'Left' && <button className="cal leftCal" onClick={() => calStat('left')}>Left claibrate</button>}
          {dirCal === 'Right' && <button className="cal rightCal" onClick={() => calStat('right')}>Right claibrate</button>}
          <p>Look at the {dirCal} Button and Press to Calibrate</p>
        </div>



        {/* SEARCH PAGE */}
        <div className="searchText" style={{ display: !calibrate ? "block" : "none" }} >
          {/* Calibrate Button */}
          <button className="calibrateButton" onClick={() => setCalibrate(true)} style={{ display: !doneSetup ? 'block' : 'none' }}>Blink SLOWLY for Default Calibration<br /><br />or<br /><br />Press to Calibrate</button>

          {/* SEARCH MODAL */}
          <div>{start && doneSetup && <Instructions />}
          </div>
          <div style={{ display: searchPrompt ? "block" : "none" }} >Say Something!</div>
          <div>
            {modalOpen && <Modal data={transcription} state={start} />}
          </div>

          {/* SEARCH RESULTS */}
          <iframe
            id="if1"
            width="100%"
            allowScriptAccess="always"
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
      </div>


      {/* DEVELOPMENT + DEGUB DATA*/}
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
