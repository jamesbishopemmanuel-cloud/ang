import { io } from "socket.io-client";
import { Capacitor } from "@capacitor/core";

const SERVER_URL = "http://localhost:3000";

let socket = null;

const app = document.querySelector("#app");

app.innerHTML = `
  <div class="container">

    <div class="logo">
      <h1>Veylora</h1>
      <p>Private Messaging Platform</p>
    </div>

    <div class="card" id="loginBox">
      <input 
        id="username"
        type="text"
        placeholder="Enter username"
      />

      <button id="connectBtn">
        Connect
      </button>
    </div>


    <div class="card chat-box hidden" id="chatBox">

      <div class="status">
        <span id="status">
          Offline
        </span>
      </div>


      <div id="messages"></div>


      <div class="message-input">

        <input
          id="message"
          type="text"
          placeholder="Write a message..."
        />

        <button id="sendBtn">
          Send
        </button>

      </div>

    </div>

  </div>
`;


const usernameInput =
  document.querySelector("#username");

const connectBtn =
  document.querySelector("#connectBtn");

const chatBox =
  document.querySelector("#chatBox");

const status =
  document.querySelector("#status");

const messages =
  document.querySelector("#messages");

const messageInput =
  document.querySelector("#message");

const sendBtn =
  document.querySelector("#sendBtn");



connectBtn.onclick = () => {

  const username =
    usernameInput.value.trim();


  if (!username) {
    alert("Enter username");
    return;
  }


  socket = io(SERVER_URL);


  socket.on("connect", () => {

    chatBox.classList.remove("hidden");

    status.textContent =
      "Online";


    socket.emit(
      "join",
      {
        username
      }
    );

  });



  socket.on(
    "message",
    (data)=>{

      addMessage(
        data.username +
        ": " +
        data.message
      );

    }
  );



  socket.on(
    "disconnect",
    ()=>{

      status.textContent =
        "Offline";

    }
  );

};



sendBtn.onclick = sendMessage;


messageInput.addEventListener(
  "keypress",
  (event)=>{

    if(event.key === "Enter"){
      sendMessage();
    }

  }
);



function sendMessage(){

  const text =
    messageInput.value.trim();


  if(!text || !socket)
    return;


  socket.emit(
    "message",
    {
      message:text
    }
  );


  addMessage(
    "You: " + text
  );


  messageInput.value="";

}



function addMessage(text){

  const item =
    document.createElement("div");


  item.className =
    "message";


  item.textContent =
    text;


  messages.appendChild(item);


  messages.scrollTop =
    messages.scrollHeight;

}



if(Capacitor.isNativePlatform()){

  console.log(
    "Veylora Android App"
  );

}
else{

  console.log(
    "Veylora Web App"
  );

}