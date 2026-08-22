import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = "https://YOUR_VEYLORA_BACKEND_URL";

export default function CallScreen() {

  const localVideo =
    useRef<HTMLVideoElement>(null);

  const remoteVideo =
    useRef<HTMLVideoElement>(null);

  const peer =
    useRef<RTCPeerConnection | null>(null);

  const socket =
    useRef<any>(null);


  const [incoming, setIncoming] =
    useState(false);

  const [callerId, setCallerId] =
    useState("");

  const [muted, setMuted] =
    useState(false);

  const [speaker, setSpeaker] =
    useState(false);



  useEffect(() => {


    socket.current = io(
      SOCKET_URL,
      {
        auth:{
          userId:"CURRENT_USER_ID"
        }
      }
    );


    socket.current.on(
      "call:incoming",
      (data:any)=>{

        setIncoming(true);
        setCallerId(data.callerId);

      }
    );


    socket.current.on(
      "webrtc:config",
      async(data:any)=>{

        peer.current =
          new RTCPeerConnection(
            data.config
          );

        setupPeer();

      }
    );


    return ()=>{

      socket.current?.disconnect();

    };


  },[]);



  async function setupPeer(){

    const stream =
      await navigator.mediaDevices.getUserMedia(
        {
          audio:true,
          video:true
        }
      );


    if(localVideo.current){

      localVideo.current.srcObject =
        stream;

    }


    stream.getTracks()
    .forEach(track=>{

      peer.current?.addTrack(
        track,
        stream
      );

    });



    peer.current!.ontrack =
      (event)=>{

        if(remoteVideo.current){

          remoteVideo.current.srcObject =
            event.streams[0];

        }

      };



    peer.current!.onicecandidate =
      (event)=>{

        if(event.candidate){

          socket.current.emit(
            "webrtc:ice",
            {
              receiverId:callerId,
              candidate:event.candidate
            }
          );

        }

      };

  }



  function acceptCall(){

    setIncoming(false);


    socket.current.emit(
      "call:accept",
      {
        callerId
      }
    );

  }



  function rejectCall(){

    socket.current.emit(
      "call:reject",
      {
        callerId
      }
    );


    setIncoming(false);

  }



  function toggleMute(){

    const tracks =
      (localVideo.current
      ?.srcObject as MediaStream)
      ?.getAudioTracks();


    tracks?.forEach(track=>{

      track.enabled =
        !track.enabled;

    });


    setMuted(!muted);

  }



  function toggleSpeaker(){

    setSpeaker(!speaker);

  }



  function endCall(){

    socket.current.emit(
      "call:end",
      {
        receiverId:callerId
      }
    );


    peer.current?.close();

  }



  return (

    <div className="call-screen">


      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        className="remote-video"
      />


      <video
        ref={localVideo}
        autoPlay
        muted
        playsInline
        className="local-video"
      />



      {
        incoming &&

        <div className="incoming-call">

          <h2>
            Incoming Call
          </h2>


          <button
            onClick={acceptCall}
          >
            Accept
          </button>


          <button
            onClick={rejectCall}
          >
            Reject
          </button>


        </div>

      }



      <div className="controls">


        <button
          onClick={toggleMute}
        >
          {muted ? "Unmute" : "Mute"}
        </button>



        <button
          onClick={toggleSpeaker}
        >
          {speaker ? "Speaker On" : "Speaker Off"}
        </button>



        <button
          onClick={endCall}
        >
          End Call
        </button>


      </div>


    </div>

  );

}