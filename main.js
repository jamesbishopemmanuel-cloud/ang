
import { io } from "socket.io-client";
import { Capacitor } from "@capacitor/core";

const APP_NAME = "Veylora";

// Change this to your backend URL when you deploy
const SERVER_URL = "http://localhost:3000";

let socket = null;

function createApp() {
  document.querySelector("#app").innerHTML = `
    <div class="veylora">
      <header>
        <h1>${APP_NAME}</h1>
        <p>Private messaging platform</p>
      </header>

      <section class="login">
        <input id="username" placeholder="Enter username">
        <button id="connect">Connect</button>
      </section>

      <section id="chat" style="display:none;">
        <div id="status">Offline</div>

        <div id="messages"></div>

        <div class="send-box">
          <input id="message" placeholder="Type message">
          <button id="send">Send</button>
        </div>
      </section>
    </div>
  `;

  document
    .getElementById("connect")
    .addEventListener("click", connectUser);

  document
    .getElementById("send")
    .addEventListener("click", sendMessage);
}


function connectUser() {

  const username =
    document.getElementById("username").value.trim();

  if (!username) {
    alert("Enter username");
    return;
  }


  socket = io(SERVER_URL, {
    transports: ["websocket"]
  });


  socket.on("connect", () => {

    document.getElementById("chat").style.display = "block";

    document.getElementById("status").innerHTML =
      "Connected";

    socket.emit("join", {
      username
    });

  });


  socket.on("message", (data)=>{

    addMessage(
      data.username + ": " + data.message
    );

  });


  socket.on("disconnect",()=>{

    document.getElementById("status").innerHTML =
      "Disconnected";

  });

}



function sendMessage(){

  const input =
    document.getElementById("message");

  const text =
    input.value.trim();


  if(!text || !socket) return;


  socket.emit("message",{
    message:text
  });


  input.value="";

}



function addMessage(text){

  const box =
    document.getElementById("messages");


  const div =
    document.createElement("div");

  div.className="message";

  div.textContent=text;


  box.appendChild(div);


  box.scrollTop =
    box.scrollHeight;

}



// Capacitor device information
async function initialize(){

  if(Capacitor.isNativePlatform()){

    console.log(
      "Running as native Android app"
    );

  }
  else{

    console.log(
      "Running as web app"
    );

  }


  createApp();

}


initialize();