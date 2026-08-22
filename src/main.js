import "./style.css";
import { io } from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://10.0.2.2:8080";

let socket = null;

const state = {
  token: localStorage.getItem("veylora_token") || "",
  user: null,
  messages: [],
  conversationId: "general"
};

const app = document.querySelector("#app");

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization =
      `Bearer ${state.token}`;
  }

  const res = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.error || "Request failed"
    );
  }

  return data;
}


function renderLogin() {
  app.innerHTML = `
    <div class="auth-card">

      <h1>Veylora</h1>

      <p>
        Connect • Create • Share
      </p>

      <input 
        id="phone"
        placeholder="+2348012345678"
      />

      <input
        id="password"
        type="password"
        placeholder="Password"
      />

      <button id="login">
        Login
      </button>

      <button id="signup">
        Create Account
      </button>

    </div>
  `;


  document
    .querySelector("#login")
    .onclick = login;


  document
    .querySelector("#signup")
    .onclick = signup;
}


async function login() {

  try {

    const phone =
      document.querySelector("#phone").value;

    const password =
      document.querySelector("#password").value;


    const data = await api(
      "/api/auth/login",
      {
        method:"POST",
        body: JSON.stringify({
          phone,
          password
        })
      }
    );


    state.token = data.token;

    state.user = data.user;

    localStorage.setItem(
      "veylora_token",
      state.token
    );


    connectSocket();

    renderHome();


  } catch(error){

    alert(error.message);

  }
}



async function signup(){

  const phone =
    document.querySelector("#phone").value;

  const password =
    document.querySelector("#password").value;


  try {

    await api(
      "/api/auth/request-otp",
      {
        method:"POST",
        body:JSON.stringify({
          phone
        })
      }
    );


    alert(
      "OTP sent. Check backend console."
    );


  } catch(error){

    alert(error.message);

  }

}



function connectSocket(){

  socket = io(
    API_URL,
    {
      auth:{
        token:state.token
      }
    }
  );


  socket.on(
    "connect",
    ()=>{
      socket.emit(
        "conversation:join",
        state.conversationId
      );
    }
  );


  socket.on(
    "message:new",
    message=>{

      state.messages.push(message);

      renderMessages();

    }
  );

}



function renderHome(){

  app.innerHTML = `

  <header>
    <h1>
      Veylora
    </h1>

    <button id="logout">
      Logout
    </button>
  </header>


  <main>

    <div class="messages"></div>


    <form id="chat">

      <input
        id="message"
        placeholder="Type message..."
      />

      <button>
        Send
      </button>

    </form>


  </main>

  `;


  document
    .querySelector("#logout")
    .onclick = logout;


  document
    .querySelector("#chat")
    .onsubmit = sendMessage;


  renderMessages();

}



function renderMessages(){

  const box =
    document.querySelector(".messages");

  if(!box)return;


  box.innerHTML =
    state.messages
    .map(
      m=>`

      <div class="message">

        <p>
        ${escapeHtml(m.text)}
        </p>

      </div>

      `
    )
    .join("");

}



function sendMessage(e){

  e.preventDefault();


  const input =
    document.querySelector("#message");


  const text =
    input.value.trim();


  if(!text)return;


  socket.emit(
    "message:send",
    {
      conversationId:
        state.conversationId,

      text
    }
  );


  input.value="";

}



function logout(){

  localStorage.removeItem(
    "veylora_token"
  );

  state.token="";

  if(socket)
    socket.disconnect();


  renderLogin();

}



if(state.token){

  connectSocket();

  renderHome();

}else{

  renderLogin();

}