import { io } from "socket.io-client";
import "./style.css";

/*
|--------------------------------------------------------------------------
| Veylora Frontend
|--------------------------------------------------------------------------
| Features:
| - Login
| - Registration
| - OTP verification
| - Persistent authentication
| - Offline message storage
| - Online/offline status
| - Real-time Socket.IO messaging
| - AI request interface
| - Voice/video call signaling
|--------------------------------------------------------------------------
*/

const API_URL =
  localStorage.getItem("vey_api_url") ||
  window.VEYLORA_API_URL ||
  "http://localhost:8080";

const STORAGE_KEYS = {
  token: "veylora_token",
  user: "veylora_user",
  messages: "veylora_messages",
  conversations: "veylora_conversations"
};

let token = localStorage.getItem(STORAGE_KEYS.token);
let currentUser = loadJSON(STORAGE_KEYS.user, null);
let socket = null;

let state = {
  screen: token && currentUser ? "app" : "login",
  activeConversation: "general",
  online: navigator.onLine,
  messages: loadJSON(STORAGE_KEYS.messages, {}),
  conversations: loadJSON(STORAGE_KEYS.conversations, [
    {
      id: "general",
      name: "Veylora Community",
      lastMessage: "Welcome to Veylora",
      updatedAt: new Date().toISOString()
    }
  ]),
  typing: false,
  loading: false
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createId(prefix = "id") {
  return `${prefix}_${crypto.randomUUID()}`;
}

function getInitials(name = "V") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("") || "V";
}

function normalizePhone(phone) {
  return String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "");
}

function setMessage(text, type = "info") {
  const element = document.querySelector("#notification");

  if (!element) {
    return;
  }

  element.textContent = text;
  element.className = `notification ${type}`;
  element.hidden = false;

  clearTimeout(setMessage.timer);

  setMessage.timer = setTimeout(() => {
    element.hidden = true;
  }, 4000);
}

/*
|--------------------------------------------------------------------------
| API
|--------------------------------------------------------------------------
*/

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      `Request failed with status ${response.status}`
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

async function register(name, phone, password) {
  state.loading = true;
  render();

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        phone: normalizePhone(phone),
        password
      })
    });

    token = data.token;
    currentUser = data.user;

    localStorage.setItem(
      STORAGE_KEYS.token,
      token
    );

    saveJSON(
      STORAGE_KEYS.user,
      currentUser
    );

    state.screen = "app";

    connectSocket();

    render();

    setMessage(
      "Account created successfully.",
      "success"
    );
  } catch (error) {
    setMessage(
      error.message,
      "error"
    );

    state.loading = false;
    render();
  }
}

async function login(phone, password) {
  state.loading = true;
  render();

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        phone: normalizePhone(phone),
        password
      })
    });

    token = data.token;
    currentUser = data.user;

    localStorage.setItem(
      STORAGE_KEYS.token,
      token
    );

    saveJSON(
      STORAGE_KEYS.user,
      currentUser
    );

    state.screen = "app";

    connectSocket();

    render();

    setMessage(
      "Welcome back to Veylora.",
      "success"
    );
  } catch (error) {
    state.loading = false;

    setMessage(
      error.message,
      "error"
    );

    render();
  }
}

async function requestOTP(phone) {
  try {
    await api("/api/auth/request-otp", {
      method: "POST",
      body: JSON.stringify({
        phone: normalizePhone(phone)
      })
    });

    setMessage(
      "OTP requested. Check your SMS/WhatsApp provider.",
      "success"
    );
  } catch (error) {
    setMessage(
      error.message,
      "error"
    );
  }
}

async function verifyOTP(phone, code) {
  try {
    const data = await api("/api/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        phone: normalizePhone(phone),
        code
      })
    });

    if (data.verified && currentUser) {
      currentUser.verified = true;

      saveJSON(
        STORAGE_KEYS.user,
        currentUser
      );
    }

    setMessage(
      "Phone number verified.",
      "success"
    );

    render();
  } catch (error) {
    setMessage(
      error.message,
      "error"
    );
  }
}

async function loadCurrentUser() {
  if (!token) {
    return;
  }

  try {
    const data = await api("/api/auth/me");

    currentUser = data.user;

    saveJSON(
      STORAGE_KEYS.user,
      currentUser
    );
  } catch {
    logout(false);
  }
}

function logout(showMessage = true) {
  token = null;
  currentUser = null;

  localStorage.removeItem(
    STORAGE_KEYS.token
  );

  localStorage.removeItem(
    STORAGE_KEYS.user
  );

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  state.screen = "login";

  render();

  if (showMessage) {
    setMessage(
      "You have been logged out.",
      "info"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

function connectSocket() {
  if (!token) {
    return;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_URL, {
    auth: {
      token
    },
    transports: ["websocket", "polling"]
  });

  socket.on("connect", () => {
    state.online = true;

    socket.emit(
      "conversation:join",
      state.activeConversation
    );

    render();
  });

  socket.on("disconnect", () => {
    state.online = false;
    render();
  });

  socket.on("connect_error", error => {
    console.warn(
      "Veylora Socket.IO:",
      error.message
    );

    state.online = false;
    render();
  });

  socket.on(
    "message:new",
    message => {
      addMessageToLocalStore(message);

      if (
        message.conversationId ===
        state.activeConversation
      ) {
        render();
        scrollMessagesToBottom();
      }
    }
  );

  socket.on(
    "typing:start",
    payload => {
      if (
        payload?.conversationId ===
        state.activeConversation &&
        payload?.userId !== currentUser?.id
      ) {
        state.typing = true;
        render();
      }
    }
  );

  socket.on(
    "typing:stop",
    payload => {
      if (
        payload?.conversationId ===
        state.activeConversation
      ) {
        state.typing = false;
        render();
      }
    }
  );

  socket.on(
    "presence:online",
    () => {
      state.online = true;
      render();
    }
  );

  socket.on(
    "presence:offline",
    () => {
      render();
    }
  );

  /*
   * Incoming call
   */

  socket.on(
    "call:incoming",
    call => {
      showIncomingCall(call);
    }
  );

  /*
   * Call accepted
   */

  socket.on(
    "call:accepted",
    call => {
      setMessage(
        "Call accepted.",
        "success"
      );
    }
  );

  /*
   * Call rejected
   */

  socket.on(
    "call:rejected",
    () => {
      setMessage(
        "Call rejected.",
        "info"
      );
    }
  );

  /*
   * Call ended
   */

  socket.on(
    "call:ended",
    () => {
      setMessage(
        "Call ended.",
        "info"
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
*/

function addMessageToLocalStore(message) {
  if (!message?.conversationId) {
    return;
  }

  if (!Array.isArray(
    state.messages[message.conversationId]
  )) {
    state.messages[message.conversationId] = [];
  }

  const exists =
    state.messages[message.conversationId]
      .some(item => item.id === message.id);

  if (!exists) {
    state.messages[
      message.conversationId
    ].push(message);
  }

  saveJSON(
    STORAGE_KEYS.messages,
    state.messages
  );
}

function addOfflineMessage(text) {
  const message = {
    id: createId("offline"),
    conversationId:
      state.activeConversation,
    senderId:
      currentUser?.id || "local-user",
    text,
    createdAt:
      new Date().toISOString(),
    pending: true
  };

  addMessageToLocalStore(message);

  return message;
}

async function sendMessage(text) {
  const cleanText = text.trim();

  if (!cleanText) {
    return;
  }

  if (cleanText.length > 5000) {
    setMessage(
      "Message is too long.",
      "error"
    );
    return;
  }

  /*
   * Offline mode
   */

  if (!navigator.onLine || !socket?.connected) {
    addOfflineMessage(cleanText);

    render();

    scrollMessagesToBottom();

    setMessage(
      "Saved offline. It will sync when you reconnect.",
      "info"
    );

    return;
  }

  socket.emit(
    "message:send",
    {
      conversationId:
        state.activeConversation,
      text: cleanText
    }
  );
}

async function loadMessages(conversationId) {
  if (!token || !navigator.onLine) {
    return;
  }

  try {
    const data = await api(
      `/api/messages/${encodeURIComponent(
        conversationId
      )}`
    );

    if (Array.isArray(data.messages)) {
      state.messages[conversationId] =
        data.messages;

      saveJSON(
        STORAGE_KEYS.messages,
        state.messages
      );

      render();
      scrollMessagesToBottom();
    }
  } catch (error) {
    console.warn(
      "Could not load messages:",
      error.message
    );
  }
}

function syncOfflineMessages() {
  if (
    !navigator.onLine ||
    !socket?.connected
  ) {
    return;
  }

  const conversationMessages =
    state.messages[
      state.activeConversation
    ] || [];

  const pending =
    conversationMessages.filter(
      message => message.pending
    );

  for (const message of pending) {
    socket.emit(
      "message:send",
      {
        conversationId:
          message.conversationId,
        text:
          message.text
      }
    );

    message.pending = false;
  }

  saveJSON(
    STORAGE_KEYS.messages,
    state.messages
  );

  render();
}

/*
|--------------------------------------------------------------------------
| AI
|--------------------------------------------------------------------------
*/

async function askAI(prompt, type = "chat") {
  if (!token) {
    setMessage(
      "Please log in first.",
      "error"
    );
    return;
  }

  try {
    setMessage(
      "Veylora AI is thinking...",
      "info"
    );

    const data = await api(
      "/api/ai/generate",
      {
        method: "POST",
        body: JSON.stringify({
          prompt,
          type
        })
      }
    );

    const result =
      typeof data.result === "string"
        ? data.result
        : JSON.stringify(
            data.result,
            null,
            2
          );

    addMessageToLocalStore({
      id: createId("ai"),
      conversationId:
        state.activeConversation,
      senderId: "vey-ai",
      text: `Veylora AI:\n${result}`,
      createdAt:
        new Date().toISOString()
    });

    render();
    scrollMessagesToBottom();
  } catch (error) {
    setMessage(
      error.message,
      "error"
    );
  }
}

/*
|--------------------------------------------------------------------------
| Calls
|--------------------------------------------------------------------------
*/

function startCall(type) {
  const targetUserId =
    window.prompt(
      "Enter the recipient user ID:"
    );

  if (!targetUserId) {
    return;
  }

  if (!socket?.connected) {
    setMessage(
      "Calling requires an internet connection.",
      "error"
    );
    return;
  }

  const callId = createId("call");

  socket.emit(
    "call:invite",
    {
      targetUserId,
      callId,
      type,
      conversationId:
        state.activeConversation
    }
  );

  setMessage(
    `${type === "video" ? "Video" : "Voice"} call started.`,
    "success"
  );
}

function showIncomingCall(call) {
  const accepted =
    window.confirm(
      `Incoming ${
        call?.type === "video"
          ? "video"
          : "voice"
      } call.\n\nAccept?`
    );

  if (!socket?.connected) {
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

    setMessage(
      "Call accepted.",
      "success"
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
| UI
|--------------------------------------------------------------------------
*/

function render() {
  const app = document.querySelector("#app");

  if (!app) {
    return;
  }

  if (state.screen === "login") {
    app.innerHTML = renderLogin();
    attachLoginEvents();
    return;
  }

  if (state.screen === "register") {
    app.innerHTML = renderRegister();
    attachRegisterEvents();
    return;
  }

  if (state.screen === "otp") {
    app.innerHTML = renderOTP();
    attachOTPEvents();
    return;
  }

  app.innerHTML = renderApplication();
  attachApplicationEvents();

  requestAnimationFrame(() => {
    scrollMessagesToBottom();
  });
}

function renderLogin() {
  return `
    <main class="auth-page">
      <section class="auth-card">
        <div class="brand">
          <div class="brand-logo">V</div>
          <h1>Veylora</h1>
        </div>

        <p class="auth-subtitle">
          Connect. Message. Create.
        </p>

        <div id="notification"></div>

        <form id="login-form">
          <label>
            Phone number
            <input
              id="login-phone"
              type="tel"
              autocomplete="tel"
              placeholder="+234..."
              required
            />
          </label>

          <label>
            Password
            <input
              id="login-password"
              type="password"
              autocomplete="current-password"
              placeholder="Your password"
              required
            />
          </label>

          <button
            class="primary-button"
            type="submit"
            ${state.loading ? "disabled" : ""}
          >
            ${state.loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <button
          class="secondary-button"
          id="register-button"
          type="button"
        >
          Create a Veylora account
        </button>

        <button
          class="link-button"
          id="offline-button"
          type="button"
        >
          Continue offline
        </button>
      </section>
    </main>
  `;
}

function renderRegister() {
  return `
    <main class="auth-page">
      <section class="auth-card">
        <div class="brand">
          <div class="brand-logo">V</div>
          <h1>Create account</h1>
        </div>

        <p class="auth-subtitle">
          Join Veylora
        </p>

        <div id="notification"></div>

        <form id="register-form">
          <label>
            Full name
            <input
              id="register-name"
              type="text"
              autocomplete="name"
              placeholder="Your name"
              minlength="2"
              required
            />
          </label>

          <label>
            Phone number
            <input
              id="register-phone"
              type="tel"
              autocomplete="tel"
              placeholder="+234..."
              required
            />
          </label>

          <label>
            Password
            <input
              id="register-password"
              type="password"
              autocomplete="new-password"
              placeholder="At least 8 characters"
              minlength="8"
              required
            />
          </label>

          <button
            class="primary-button"
            type="submit"
          >
            Create account
          </button>
        </form>

        <button
          class="secondary-button"
          id="back-login"
          type="button"
        >
          Back to login
        </button>
      </section>
    </main>
  `;
}

function renderOTP() {
  const phone =
    localStorage.getItem(
      "veylora_otp_phone"
    ) || "";

  return `
    <main class="auth-page">
      <section class="auth-card">
        <div class="brand">
          <div class="brand-logo">✓</div>
          <h1>Verify phone</h1>
        </div>

        <p class="auth-subtitle">
          Enter the 6-digit verification code
          sent to ${escapeHTML(phone)}.
        </p>

        <div id="notification"></div>

        <form id="otp-form">
          <label>
            Verification code
            <input
              id="otp-code"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              maxlength="6"
              placeholder="000000"
              required
            />
          </label>

          <button
            class="primary-button"
            type="submit"
          >
            Verify
          </button>
        </form>

        <button
          class="secondary-button"
          id="resend-otp"
          type="button"
        >
          Resend OTP
        </button>

        <button
          class="link-button"
          id="otp-back"
          type="button"
        >
          Back
        </button>
      </section>
    </main>
  `;
}

function renderApplication() {
  const conversation =
    state.conversations.find(
      item =>
        item.id ===
        state.activeConversation
    ) ||
    state.conversations[0];

  const messages =
    state.messages[
      state.activeConversation
    ] || [];

  return `
    <div class="vey-app">

      <header class="topbar">
        <div class="topbar-brand">
          <div class="small-logo">V</div>
          <strong>Veylora</strong>
        </div>

        <div class="connection-status">
          <span class="${
            state.online
              ? "online-dot"
              : "offline-dot"
          }"></span>

          ${
            state.online
              ? "Online"
              : "Offline"
          }
        </div>

        <button
          id="logout-button"
          class="icon-button"
          type="button"
          title="Log out"
        >
          ⎋
        </button>
      </header>

      <div id="notification"></div>

      <main class="messenger">

        <aside class="sidebar">

          <div class="profile-card">
            <div class="avatar">
              ${escapeHTML(
                getInitials(
                  currentUser?.name
                )
              )}
            </div>

            <div>
              <strong>
                ${escapeHTML(
                  currentUser?.name ||
                  "Veylora User"
                )}
              </strong>

              <small>
                ${escapeHTML(
                  currentUser?.phone ||
                  ""
                )}
              </small>
            </div>
          </div>

          <div class="sidebar-actions">
            <button
              id="new-chat"
              type="button"
            >
              ＋ New chat
            </button>

            <button
              id="ai-button"
              type="button"
            >
              ✨ Veylora AI
            </button>
          </div>

          <div class="conversation-list">
            ${state.conversations
              .map(
                item => `
                  <button
                    class="conversation ${
                      item.id ===
                      state.activeConversation
                        ? "active"
                        : ""
                    }"
                    data-conversation-id="${
                      escapeHTML(item.id)
                    }"
                    type="button"
                  >
                    <div class="conversation-avatar">
                      ${escapeHTML(
                        getInitials(
                          item.name
                        )
                      )}
                    </div>

                    <div class="conversation-info">
                      <strong>
                        ${escapeHTML(
                          item.name
                        )}
                      </strong>

                      <span>
                        ${escapeHTML(
                          item.lastMessage ||
                          ""
                        )}
                      </span>
                    </div>
                  </button>
                `
              )
              .join("")}
          </div>
        </aside>

        <section class="chat">

          <header class="chat-header">
            <div>
              <h2>
                ${escapeHTML(
                  conversation.name
                )}
              </h2>

              <span>
                ${
                  state.online
                    ? "Connected"
                    : "Offline mode"
                }
              </span>
            </div>

            <div class="call-actions">
              <button
                id="voice-call"
                type="button"
                title="Voice call"
              >
                ☎
              </button>

              <button
                id="video-call"
                type="button"
                title="Video call"
              >
                ◉
              </button>
            </div>
          </header>

          <div
            id="messages"
            class="messages"
          >
            ${
              messages.length
                ? messages
                    .map(
                      message =>
                        renderMessage(
                          message
                        )
                    )
                    .join("")
                : `
                  <div class="empty-chat">
                    <div class="empty-icon">
                      💬
                    </div>

                    <h3>
                      Welcome to Veylora
                    </h3>

                    <p>
                      Send your first message.
                    </p>
                  </div>
                `
            }
          </div>

          ${
            state.typing
              ? `
                <div class="typing-indicator">
                  Someone is typing...
                </div>
              `
              : ""
          }

          <form
            id="message-form"
            class="composer"
          >
            <button
              id="emoji-button"
              type="button"
              title="Emoji"
            >
              😊
            </button>

            <input
              id="message-input"
              type="text"
              autocomplete="off"
              placeholder="${
                state.online
                  ? "Write a message..."
                  : "Write offline..."
              }"
              maxlength="5000"
            />

            <button
              id="send-button"
              class="send-button"
              type="submit"
            >
              ➤
            </button>
          </form>

        </section>
      </main>
    </div>
  `;
}

function renderMessage(message) {
  const mine =
    message.senderId ===
    currentUser?.id;

  const ai =
    message.senderId === "vey-ai";

  return `
    <div
      class="message-row ${
        mine ? "mine" : ""
      } ${ai ? "ai-message" : ""}"
    >
      <div class="message-bubble">

        <div class="message-text">
          ${escapeHTML(
            message.text
          ).replaceAll(
            "\n",
            "<br>"
          )}
        </div>

        <div class="message-meta">
          ${formatTime(
            message.createdAt
          )}

          ${
            message.pending
              ? " · pending"
              : ""
          }
        </div>

      </div>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| Event handlers
|--------------------------------------------------------------------------
*/

function attachLoginEvents() {
  const form =
    document.querySelector(
      "#login-form"
    );

  form?.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const phone =
        document.querySelector(
          "#login-phone"
        )?.value;

      const password =
        document.querySelector(
          "#login-password"
        )?.value;

      await login(
        phone,
        password
      );
    }
  );

  document
    .querySelector("#register-button")
    ?.addEventListener(
      "click",
      () => {
        state.screen = "register";
        render();
      }
    );

  document
    .querySelector("#offline-button")
    ?.addEventListener(
      "click",
      () => {
        currentUser = {
          id: "offline-user",
          name: "Offline User",
          phone: "",
          verified: false
        };

        state.screen = "app";

        render();

        setMessage(
          "Offline mode enabled.",
          "info"
        );
      }
    );
}

function attachRegisterEvents() {
  document
    .querySelector("#register-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const name =
          document.querySelector(
            "#register-name"
          )?.value.trim();

        const phone =
          document.querySelector(
            "#register-phone"
          )?.value;

        const password =
          document.querySelector(
            "#register-password"
          )?.value;

        if (
          !name ||
          !phone ||
          !password
        ) {
          setMessage(
            "Please complete all fields.",
            "error"
          );

          return;
        }

        await register(
          name,
          phone,
          password
        );

        /*
         * Request OTP after account creation.
         */

        if (token) {
          try {
            await requestOTP(phone);

            localStorage.setItem(
              "veylora_otp_phone",
              normalizePhone(phone)
            );

            state.screen = "otp";

            render();
          } catch {
            // Registration already succeeded.
          }
        }
      }
    );

  document
    .querySelector("#back-login")
    ?.addEventListener(
      "click",
      () => {
        state.screen = "login";
        render();
      }
    );
}

function attachOTPEvents() {
  const phone =
    localStorage.getItem(
      "veylora_otp_phone"
    ) || "";

  document
    .querySelector("#otp-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const code =
          document.querySelector(
            "#otp-code"
          )?.value.trim();

        if (!/^\d{6}$/.test(code)) {
          setMessage(
            "Enter a valid 6-digit OTP.",
            "error"
          );

          return;
        }

        await verifyOTP(
          phone,
          code
        );

        if (
          currentUser?.verified
        ) {
          state.screen = "app";
          render();
        }
      }
    );

  document
    .querySelector("#resend-otp")
    ?.addEventListener(
      "click",
      async () => {
        await requestOTP(
          phone
        );
      }
    );

  document
    .querySelector("#otp-back")
    ?.addEventListener(
      "click",
      () => {
        state.screen = "login";
        render();
      }
    );
}

function attachApplicationEvents() {
  document
    .querySelector("#logout-button")
    ?.addEventListener(
      "click",
      () => logout()
    );

  document
    .querySelector("#message-form")
    ?.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const input =
          document.querySelector(
            "#message-input"
          );

        if (!input) {
          return;
        }

        const text =
          input.value.trim();

        if (!text) {
          return;
        }

        input.value = "";

        await sendMessage(text);
      }
    );

  document
    .querySelector("#message-input")
    ?.addEventListener(
      "input",
      event => {
        const text =
          event.target.value;

        if (
          socket?.connected &&
          text.trim()
        ) {
          socket.emit(
            "typing:start",
            state.activeConversation
          );
        } else if (
          socket?.connected
        ) {
          socket.emit(
            "typing:stop",
            state.activeConversation
          );
        }
      }
    );

  document
    .querySelector("#emoji-button")
    ?.addEventListener(
      "click",
      () => {
        const input =
          document.querySelector(
            "#message-input"
          );

        if (!input) {
          return;
        }

        input.value += " 😊";
        input.focus();
      }
    );

  document
    .querySelectorAll(
      "[data-conversation-id]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          const id =
            button.dataset
              .conversationId;

          if (!id) {
            return;
          }

          if (
            socket?.connected
          ) {
            socket.emit(
              "conversation:leave",
              state.activeConversation
            );

            socket.emit(
              "conversation:join",
              id
            );
          }

          state.activeConversation =
            id;

          state.typing = false;

          render();

          await loadMessages(id);
        }
      );
    });

  document
    .querySelector("#new-chat")
    ?.addEventListener(
      "click",
      () => {
        const name =
          window.prompt(
            "Enter the chat name:"
          );

        if (!name?.trim()) {
          return;
        }

        const id =
          createId("conversation");

        state.conversations.unshift({
          id,
          name: name.trim(),
          lastMessage: "",
          updatedAt:
            new Date().toISOString()
        });

        saveJSON(
          STORAGE_KEYS.conversations,
          state.conversations
        );

        state.activeConversation =
          id;

        render();
      }
    );

  document
    .querySelector("#ai-button")
    ?.addEventListener(
      "click",
      async () => {
        const prompt =
          window.prompt(
            "Ask Veylora AI:"
          );

        if (!prompt?.trim()) {
          return;
        }

        await askAI(
          prompt.trim()
        );
      }
    );

  document
    .querySelector("#voice-call")
    ?.addEventListener(
      "click",
      () => {
        startCall("voice");
      }
    );

  document
    .querySelector("#video-call")
    ?.addEventListener(
      "click",
      () => {
        startCall("video");
      }
    );
}

/*
|--------------------------------------------------------------------------
| Network state
|--------------------------------------------------------------------------
*/

window.addEventListener(
  "online",
  () => {
    state.online = true;

    render();

    connectSocket();

    syncOfflineMessages();

    setMessage(
      "Internet connection restored.",
      "success"
    );
  }
);

window.addEventListener(
  "offline",
  () => {
    state.online = false;

    render();

    setMessage(
      "You are offline. Veylora offline mode is active.",
      "info"
    );
  }
);

/*
|--------------------------------------------------------------------------
| Keyboard shortcuts
|--------------------------------------------------------------------------
*/

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape"
    ) {
      const input =
        document.querySelector(
          "#message-input"
        );

      if (input) {
        input.blur();
      }
    }
  }
);

/*
|--------------------------------------------------------------------------
| Initial startup
|--------------------------------------------------------------------------
*/

async function startVeylora() {
  render();

  if (token) {
    await loadCurrentUser();

    if (token && currentUser) {
      state.screen = "app";

      connectSocket();

      render();

      await loadMessages(
        state.activeConversation
      );
    }
  }
}

startVeylora();