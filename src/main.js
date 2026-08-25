
import "./style.css";

import { io } from "socket.io-client";

const app = document.querySelector("#app");

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8080";


let socket = null;


function render() {

  app.innerHTML = `
    <div class="container">

      <div class="logo">
        Veylora
      </div>

      <h1>
        Connect • Create • Share
      </h1>

      <p class="status">
        Welcome to Veylora messaging platform
      </p>


      <div class="card">

        <h2>
          Real-time Messaging
        </h2>

        <p>
          Fast, secure communication with AI,
          voice calls, video calls and offline support.
        </p>

        <button id="connect">
          Connect Server
        </button>

        <div id="result"></div>

      </div>


    </div>
  `;


  document
    .getElementById("connect")
    .onclick = connectServer;

}


function connectServer(){

  const result =
    document.getElementById("result");


  result.innerHTML =
    "Connecting...";


  try {

    socket = io(API_URL, {
      transports:[
        "websocket"
      ]
    });


    socket.on(
      "connect",
      ()=>{

        result.innerHTML =
        `
        <span class="online">
        Connected successfully
        </span>
        `;

      }
    );


    socket.on(
      "connect_error",
      ()=>{

        result.innerHTML =
        `
        <span class="error">
        Server connection failed
        </span>
        `;

      }
    );


  } catch(error){

    result.innerHTML =
    "Connection error";

  }

}



render();