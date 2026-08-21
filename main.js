import "./style.css";
import { io } from "socket.io-client";

/*
|--------------------------------------------------------------------------
| Veylora configuration
|--------------------------------------------------------------------------
|
| Set VITE_API_URL in your build environment:
|
| VITE_API_URL=https://your-real-backend.example.com
|
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

const state = {
  user: {
    id: localStorage.getItem("veylora_user_id") || "",
    name: "Veylora User",
    phone: ""
  },

  aiCredits: 1240,

  stories: [
    {
      name: "Veylora User",
      text: "Welcome to Veylora! 🎉",
      time: "Just now"
    }
  ],

  channels: [
    {
      name: "Veylora Creators",
      description: "Creator news and updates",
      followers: 1280
    }
  ],

  messages: [],

  conversationId:
    localStorage.getItem(
      "veylora_conversation_id"
    ) || "general"
};

let socket = null;

/*
|--------------------------------------------------------------------------
| Navigation
|--------------------------------------------------------------------------
*/

const navigation = [
  ["home", "Home"],
  ["chat", "Chat"],
  ["calls", "Calls"],
  ["stories", "Stories"],
  ["channels", "Channels"],
  ["ai", "AI"],
  ["premium", "Premium"],
  ["admin", "Admin"]
];

/*
|--------------------------------------------------------------------------
| Authentication helpers
|--------------------------------------------------------------------------
*/

function getAuthToken() {
  return localStorage.getItem(
    "veylora_token"
  );
}

function getCurrentUserId() {
  return (
    localStorage.getItem(
      "veylora_user_id"
    ) || state.user.id
  );
}

function isAuthenticated() {
  return Boolean(getAuthToken());
}

function saveAuth(data) {
  if (data?.token) {
    localStorage.setItem(
      "veylora_token",
      data.token
    );
  }

  if (data?.user?.id) {
    localStorage.setItem(
      "veylora_user_id",
      data.user.id
    );

    state.user.id = data.user.id;
  }

  if (data?.user?.name) {
    state.user.name = data.user.name;
  }

  if (data?.user?.phone) {
    state.user.phone = data.user.phone;
  }

  saveState();
}

/*
|--------------------------------------------------------------------------
| Local state
|--------------------------------------------------------------------------
*/

function saveState() {
  localStorage.setItem(
    "veylora_state",
    JSON.stringify(state)
  );
}

function loadState() {
  try {
    const saved =
      localStorage.getItem(
        "veylora_state"
      );

    if (saved) {
      const parsed =
        JSON.parse(saved);

      Object.assign(
        state,
        parsed
      );
    }

    state.user.id =
      getCurrentUserId() ||
      state.user.id ||
      "";

  } catch {
    console.log(
      "Local state could not be loaded."
    );
  }
}

/*
|--------------------------------------------------------------------------
| HTML escaping
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/*
|--------------------------------------------------------------------------
| API helper
|--------------------------------------------------------------------------
*/

async function api(
  path,
  options = {}
) {
  const headers = {
    "Content-Type":
      "application/json",
    ...(options.headers || {})
  };

  const token =
    getAuthToken();

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,
        headers
      }
    );

  let data = null;

  try {
    data =
      await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      `Request failed (${response.status})`
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Socket.IO real-time chat
|--------------------------------------------------------------------------
*/

function connectChat() {
  const token =
    getAuthToken();

  if (!token) {
    console.log(
      "Chat waiting for authentication."
    );
    return;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_URL, {
    transports: ["websocket"],
    auth: {
      token
    }
  });

  socket.on(
    "connect",
    () => {
      console.log(
        "Connected to Veylora real-time chat."
      );

      socket.emit(
        "conversation:join",
        state.conversationId
      );
    }
  );

  socket.on(
    "connect_error",
    error => {
      console.error(
        "Chat connection failed:",
        error.message
      );
    }
  );

  socket.on(
    "disconnect",
    reason => {
      console.log(
        "Chat disconnected:",
        reason
      );
    }
  );

  socket.on(
    "message:new",
    message => {
      handleIncomingMessage(
        message
      );
    }
  );

  socket.on(
    "call:incoming",
    call => {
      handleIncomingCall(
        call
      );
    }
  );

  socket.on(
    "call:accepted",
    call => {
      console.log(
        "Call accepted:",
        call
      );
    }
  );

  socket.on(
    "call:rejected",
    call => {
      alert(
        "The call was rejected."
      );
    }
  );

  socket.on(
    "call:ended",
    () => {
      alert(
        "The call has ended."
      );
    }
  );
}

function handleIncomingMessage(
  message
) {
  if (
    !message ||
    message.conversationId !==
      state.conversationId
  ) {
    return;
  }

  /*
   * Avoid showing the same message twice.
   */

  const alreadyExists =
    state.messages.some(
      item =>
        item.id === message.id
    );

  if (alreadyExists) {
    return;
  }

  state.messages.push({
    id: message.id,
    from:
      message.senderId ===
      getCurrentUserId()
        ? "You"
        : "Veylora User",
    senderId:
      message.senderId,
    text: message.text,
    time: formatTime(
      message.createdAt
    )
  });

  saveState();

  if (
    document.getElementById(
      "messageInput"
    )
  ) {
    chatPage();
  }
}

function formatTime(value) {
  if (!value) {
    return "Now";
  }

  try {
    return new Date(
      value
    ).toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  } catch {
    return "Now";
  }
}

/*
|--------------------------------------------------------------------------
| Shell
|--------------------------------------------------------------------------
*/

function shell(
  active,
  content
) {
  document.getElementById(
    "app"
  ).innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="logo">V</div>

        <div>
          <strong>Veylora</strong>
          <small>
            Connect • Create • Share
          </small>
        </div>
      </div>

      <div class="user-pill">
        ${escapeHtml(
          state.user.name
        )}
      </div>
    </header>

    <nav class="navigation">
      ${navigation
        .map(
          ([id, label]) => `
            <button
              class="${
                active === id
                  ? "active"
                  : ""
              }"
              onclick="showPage('${id}')">
              ${label}
            </button>
          `
        )
        .join("")}
    </nav>

    <main>
      ${content}
    </main>
  `;
}

/*
|--------------------------------------------------------------------------
| Home
|--------------------------------------------------------------------------
*/

function homePage() {
  shell(
    "home",
    `
      <section class="hero">
        <div>
          <span class="eyebrow">
            VEYLORA
          </span>

          <h1>
            Connect.<br>
            Create.<br>
            Share.
          </h1>

          <p>
            Messaging, free voice and
            video calls, Stories, Status,
            Channels and AI.
          </p>

          <div class="actions">
            <button
              class="primary"
              onclick="showPage('chat')">
              Open Chat
            </button>

            <button
              onclick="showPage('ai')">
              Open AI
            </button>
          </div>
        </div>

        <div class="credit-card">
          <small>AI CREDITS</small>
          <strong>
            ${state.aiCredits}
          </strong>
          <span>available</span>
        </div>
      </section>

      <section>
        <h2>
          Veylora features
        </h2>

        <div class="feature-grid">
          ${[
            ["💬", "Messaging"],
            ["📞", "Voice Calls"],
            ["🎥", "Video Calls"],
            ["📸", "Stories"],
            ["🟢", "Status"],
            ["📢", "Channels"],
            ["🤖", "AI"],
            ["💎", "Premium"]
          ]
            .map(
              ([icon, title]) => `
                <article class="card">
                  <div class="feature-icon">
                    ${icon}
                  </div>

                  <h3>
                    ${title}
                  </h3>

                  <p>
                    Open ${title}
                  </p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `
  );
}

/*
|--------------------------------------------------------------------------
| Chat
|--------------------------------------------------------------------------
*/

async function loadMessages() {
  if (!isAuthenticated()) {
    return;
  }

  try {
    const data =
      await api(
        `/api/messages/${encodeURIComponent(
          state.conversationId
        )}`
      );

    if (
      Array.isArray(
        data?.messages
      )
    ) {
      state.messages =
        data.messages.map(
          message => ({
            id: message.id,
            from:
              message.senderId ===
              getCurrentUserId()
                ? "You"
                : "Veylora User",
            senderId:
              message.senderId,
            text: message.text,
            time:
              formatTime(
                message.createdAt
              )
          })
        );

      saveState();
    }
  } catch (error) {
    console.error(
      "Could not load messages:",
      error
    );
  }
}

function chatPage() {
  shell(
    "chat",
    `
      <section class="panel">
        <h2>Messages</h2>

        ${
          !isAuthenticated()
            ? `
              <div class="notice">
                Please sign in before
                using real-time chat.
              </div>
            `
            : `
              <div class="connection-status">
                ${
                  socket?.connected
                    ? "🟢 Connected"
                    : "🔴 Connecting..."
                }
              </div>
            `
        }

        <div class="messages">
          ${
            state.messages.length
              ? state.messages
                  .map(
                    message => `
                      <div class="message">
                        <strong>
                          ${escapeHtml(
                            message.from
                          )}
                        </strong>

                        <p>
                          ${escapeHtml(
                            message.text
                          )}
                        </p>

                        <small>
                          ${escapeHtml(
                            message.time
                          )}
                        </small>
                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="notice">
                  No messages yet.
                </div>
              `
          }
        </div>

        <form
          onsubmit="sendMessage(event)">

          <input
            id="messageInput"
            autocomplete="off"
            placeholder="Write a message..."
            required>

          <button
            class="primary">
            Send
          </button>
        </form>
      </section>
    `
  );
}

window.sendMessage =
  function(event) {
    event.preventDefault();

    const input =
      document.getElementById(
        "messageInput"
      );

    if (!input) {
      return;
    }

    const text =
      input.value.trim();

    if (!text) {
      return;
    }

    if (!isAuthenticated()) {
      alert(
        "Please sign in before sending messages."
      );
      return;
    }

    if (
      !socket ||
      !socket.connected
    ) {
      alert(
        "Chat is not connected. Check your internet connection and backend URL."
      );
      return;
    }

    socket.emit(
      "conversation:join",
      state.conversationId
    );

    socket.emit(
      "message:send",
      {
        conversationId:
          state.conversationId,
        text
      }
    );

    input.value = "";
  };

/*
|--------------------------------------------------------------------------
| Authentication UI
|--------------------------------------------------------------------------
*/

function authPage() {
  shell(
    "home",
    `
      <section class="panel">
        <h2>
          Veylora Login
        </h2>

        <form
          onsubmit="login(event)">

          <input
            id="loginPhone"
            placeholder="+234..."
            required>

          <input
            id="loginPassword"
            type="password"
            placeholder="Password"
            minlength="8"
            required>

          <button
            class="primary">
            Sign in
          </button>
        </form>

        <div
          id="authResult">
        </div>
      </section>
    `
  );
}

window.login =
  async function(event) {
    event.preventDefault();

    const phone =
      document.getElementById(
        "loginPhone"
      ).value.trim();

    const password =
      document.getElementById(
        "loginPassword"
      ).value;

    const result =
      document.getElementById(
        "authResult"
      );

    try {
      const data =
        await api(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify({
              phone,
              password
            })
          }
        );

      saveAuth(data);

      connectChat();

      result.innerHTML = `
        <div class="notice">
          Login successful.
        </div>
      `;

      setTimeout(
        () => showPage("chat"),
        500
      );
    } catch (error) {
      result.innerHTML = `
        <div class="notice">
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  };

window.logout =
  function() {
    localStorage.removeItem(
      "veylora_token"
    );

    localStorage.removeItem(
      "veylora_user_id"
    );

    if (socket) {
      socket.disconnect();
      socket = null;
    }

    state.user.id = "";
    state.user.phone = "";

    showPage("home");
  };

/*
|--------------------------------------------------------------------------
| Calls
|--------------------------------------------------------------------------
*/

function callsPage() {
  shell(
    "calls",
    `
      <section class="panel">
        <h2>Calls</h2>

        <p>
          Voice and video calling.
        </p>

        <div class="call-grid">
          <button
            class="call-card"
            onclick="startCall('voice')">

            <span>📞</span>

            <strong>
              Voice Call
            </strong>

            <small>
              FREE
            </small>
          </button>

          <button
            class="call-card"
            onclick="startCall('video')">

            <span>🎥</span>

            <strong>
              Video Call
            </strong>

            <small>
              FREE
            </small>
          </button>
        </div>

        <div class="notice">
          Real-time WebRTC signaling is
          connected through the Veylora
          backend.
        </div>
      </section>
    `
  );
}

window.startCall =
  function(type) {
    if (!isAuthenticated()) {
      alert(
        "Please sign in before making a call."
      );
      return;
    }

    if (
      !socket ||
      !socket.connected
    ) {
      alert(
        "Call service is not connected."
      );
      return;
    }

    const targetUserId =
      prompt(
        "Enter the recipient user ID:"
      );

    if (
      !targetUserId ||
      !targetUserId.trim()
    ) {
      return;
    }

    const callId =
      crypto.randomUUID();

    socket.emit(
      "call:invite",
      {
        targetUserId:
          targetUserId.trim(),
        callId,
        type
      }
    );

    alert(
      `${
        type === "video"
          ? "Video"
          : "Voice"
      } call invitation sent.`
    );
  };

function handleIncomingCall(
  call
) {
  const type =
    call?.type === "video"
      ? "Video"
      : "Voice";

  const accepted =
    confirm(
      `Incoming ${type.toLowerCase()} call. Accept?`
    );

  if (!socket) {
    return;
  }

  if (accepted) {
    socket.emit(
      "call:accept",
      {
        targetUserId:
          call.callerId,
        callId:
          call.callId
      }
    );

    alert(
      `${type} call accepted. WebRTC media setup should now begin.`
    );
  } else {
    socket.emit(
      "call:reject",
      {
        targetUserId:
          call.callerId,
        callId:
          call.callId
      }
    );
  }
}

/*
|--------------------------------------------------------------------------
| Stories
|--------------------------------------------------------------------------
*/

function storiesPage() {
  shell(
    "stories",
    `
      <section class="panel">
        <h2>
          Stories & Status
        </h2>

        <p>
          Create a story or status update.
        </p>

        <form
          onsubmit="createStory(event)">

          <textarea
            id="storyText"
            placeholder="What's happening?"
            required></textarea>

          <button
            class="primary">
            📸 Post Story — FREE
          </button>
        </form>

        <div class="stories-list">
          ${state.stories
            .map(
              story => `
                <article class="story-card">
                  <strong>
                    ${escapeHtml(
                      story.name
                    )}
                  </strong>

                  <p>
                    ${escapeHtml(
                      story.text
                    )}
                  </p>

                  <small>
                    ${escapeHtml(
                      story.time
                    )}
                  </small>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `
  );
}

window.createStory =
  function(event) {
    event.preventDefault();

    const input =
      document.getElementById(
        "storyText"
      );

    const text =
      input.value.trim();

    if (!text) {
      return;
    }

    state.stories.unshift({
      name: state.user.name,
      text,
      time: "Just now"
    });

    saveState();

    storiesPage();
  };

/*
|--------------------------------------------------------------------------
| Channels
|--------------------------------------------------------------------------
*/

function channelsPage() {
  shell(
    "channels",
    `
      <section class="panel">
        <h2>Channels</h2>

        <button
          class="primary"
          onclick="createChannel()">
          ＋ Create Channel — FREE
        </button>

        <div class="channel-list">
          ${state.channels
            .map(
              channel => `
                <article class="channel-card">
                  <h3>
                    ${escapeHtml(
                      channel.name
                    )}
                  </h3>

                  <p>
                    ${escapeHtml(
                      channel.description
                    )}
                  </p>

                  <small>
                    ${
                      channel.followers
                    }
                    followers
                  </small>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `
  );
}

window.createChannel =
  function() {
    const name =
      prompt(
        "Enter your channel name:"
      );

    if (
      !name ||
      !name.trim()
    ) {
      return;
    }

    state.channels.unshift({
      name: name.trim(),
      description:
        "New Veylora channel",
      followers: 0
    });

    saveState();

    channelsPage();
  };

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
*/

function aiPage() {
  const tools = [
    "AI Chat",
    "Text → Image",
    "Text → Video",
    "Image → Video",
    "AI Voice",
    "AI Photo Edit",
    "AI Video Edit"
  ];

  shell(
    "ai",
    `
      <section class="panel">
        <h2>
          Veylora AI
        </h2>

        <div class="ai-balance">
          <strong>
            ${state.aiCredits}
          </strong>

          <span>
            AI credits
          </span>
        </div>

        <div class="ai-grid">
          ${tools
            .map(
              tool => `
                <button
                  class="ai-tool"
                  onclick="useAI('${escapeHtml(
                    tool
                  )}')">

                  <strong>
                    ${escapeHtml(
                      tool
                    )}
                  </strong>

                  <small>
                    Use AI
                  </small>
                </button>
              `
            )
            .join("")}
        </div>

        <textarea
          id="aiPrompt"
          placeholder="Tell Veylora AI what you want...">
        </textarea>

        <button
          class="primary"
          onclick="generateAI()">
          ✨ Generate
        </button>

        <div
          id="aiResult">
        </div>
      </section>
    `
  );
}

let selectedAITool =
  "AI Chat";

window.useAI =
  function(tool) {
    selectedAITool =
      tool;

    const prompt =
      document.getElementById(
        "aiPrompt"
      );

    if (prompt) {
      prompt.placeholder =
        `${tool}: Tell Veylora AI what you want...`;
      prompt.focus();
    }
  };

window.generateAI =
  async function() {
    const input =
      document.getElementById(
        "aiPrompt"
      );

    const result =
      document.getElementById(
        "aiResult"
      );

    const prompt =
      input.value.trim();

    if (!prompt) {
      alert(
        "Enter a prompt first."
      );
      return;
    }

    if (
      state.aiCredits < 1
    ) {
      alert(
        "You have no AI credits remaining."
      );
      return;
    }

    if (!isAuthenticated()) {
      result.innerHTML = `
        <div class="notice">
          Please sign in before using AI.
        </div>
      `;
      return;
    }

    result.innerHTML = `
      <div class="notice">
        Generating...
      </div>
    `;

    try {
      const data =
        await api(
          "/api/ai/generate",
          {
            method: "POST",
            body: JSON.stringify({
              prompt,
              type:
                selectedAITool
            })
          }
        );

      state.aiCredits -= 1;

      saveState();

      result.innerHTML = `
        <div class="notice">
          <strong>
            AI result
          </strong>

          <p>
            ${escapeHtml(
              JSON.stringify(
                data.result ??
                  data,
                null,
                2
              )
            )}
          </p>
        </div>
      `;
    } catch (error) {
      result.innerHTML = `
        <div class="notice">
          ${escapeHtml(
            error.message
          )}
        </div>
      `;
    }
  };

/*
|--------------------------------------------------------------------------
| Premium / Payments
|--------------------------------------------------------------------------
*/

function premiumPage() {
  const plans = [
    {
      name: "Go",
      price: "₦10,000",
      amount: 1000000,
      features: [
        "More AI credits",
        "Faster processing"
      ]
    },
    {
      name: "Pro",
      price: "₦30,000",
      amount: 3000000,
      trial:
        "2 months eligible trial",
      features: [
        "Everything in Go",
        "Advanced AI",
        "Higher AI limits",
        "Priority processing"
      ]
    },
    {
      name: "Ultra",
      price: "₦50,000",
      amount: 5000000,
      trial:
        "7-day eligible trial",
      features: [
        "Everything in Pro",
        "Highest AI priority",
        "Highest AI allowance",
        "Ultra AI tools"
      ]
    }
  ];

  shell(
    "premium",
    `
      <section class="panel">
        <h2>
          Premium
        </h2>

        <p>
          Premium plans unlock advanced AI
          and additional services.
        </p>

        <div class="plans">
          ${plans
            .map(
              plan => `
                <article class="plan-card">
                  <h3>
                    ${plan.name}
                  </h3>

                  <div class="price">
                    ${plan.price}
                    <small>
                      /month
                    </small>
                  </div>

                  ${
                    plan.trial
                      ? `
                        <div class="trial">
                          ${plan.trial}
                        </div>
                      `
                      : ""
                  }

                  <ul>
                    ${plan.features
                      .map(
                        feature => `
                          <li>
                            ✓ ${feature}
                          </li>
                        `
                      )
                      .join("")}
                  </ul>

                  <button
                    class="primary full"
                    onclick="startCheckout(
                      '${plan.name}',
                      ${plan.amount}
                    )">
                    Choose ${plan.name}
                  </button>
                </article>
              `
            )
            .join("")}
        </div>

        <div class="notice">
          Payment verification is performed
          by the backend.
        </div>
      </section>
    `
  );
}

window.startCheckout =
  async function(
    plan,
    amount
  ) {
    if (!isAuthenticated()) {
      alert(
        "Please sign in before making a payment."
      );
      return;
    }

    const email =
      prompt(
        "Enter your payment email:"
      );

    if (
      !email ||
      !email.includes("@")
    ) {
      return;
    }

    try {
      const data =
        await api(
          "/api/payments/paystack/initialize",
          {
            method: "POST",
            body: JSON.stringify({
              email,
              amount,
              plan
            })
          }
        );

      if (
        data.authorization_url
      ) {
        window.location.href =
          data.authorization_url;
      } else {
        alert(
          "Payment session could not be created."
        );
      }
    } catch (error) {
      alert(
        error.message
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Admin
|--------------------------------------------------------------------------
*/

function adminPage() {
  shell(
    "admin",
    `
      <section class="panel">
        <h2>
          Admin Dashboard
        </h2>

        <div class="stats">
          <article>
            <small>Users</small>
            <strong>
              128,540
            </strong>
          </article>

          <article>
            <small>Active</small>
            <strong>
              45,320
            </strong>
          </article>

          <article>
            <small>AI Credits</small>
            <strong>
              18.2M
            </strong>
          </article>

          <article>
            <small>Stories</small>
            <strong>
              ${state.stories.length}
            </strong>
          </article>
        </div>

        <div class="notice">
          Admin authorization must be
          enforced by the backend.
        </div>
      </section>
    `
  );
}

/*
|--------------------------------------------------------------------------
| Page routing
|--------------------------------------------------------------------------
*/

window.showPage =
  async function(page) {
    const pages = {
      home: homePage,
      chat: chatPage,
      calls: callsPage,
      stories: storiesPage,
      channels: channelsPage,
      ai: aiPage,
      premium: premiumPage,
      admin: adminPage,
      login: authPage
    };

    if (!pages[page]) {
      return;
    }

    if (
      page === "chat" &&
      isAuthenticated()
    ) {
      await loadMessages();
    }

    pages[page]();
  };

/*
|--------------------------------------------------------------------------
| Startup
|--------------------------------------------------------------------------
*/

loadState();

if (isAuthenticated()) {
  connectChat();
}

showPage("home");