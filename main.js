import "./style.css";
import { io } from "socket.io-client";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://10.0.2.2:8080";

let socket = null;

const state = {
  user: null,
  token: localStorage.getItem("veylora_token") || "",
  aiCredits:
    Number(localStorage.getItem("veylora_ai_credits")) || 1240,
  messages: [],
  currentConversationId: "general",

  stories: [
    {
      name: "Veylora",
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
  ]
};

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

/* =========================================================
   UTILITIES
========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function saveLocalState() {
  localStorage.setItem(
    "veylora_ai_credits",
    String(state.aiCredits)
  );

  localStorage.setItem(
    "veylora_stories",
    JSON.stringify(state.stories)
  );

  localStorage.setItem(
    "veylora_channels",
    JSON.stringify(state.channels)
  );
}

function loadLocalState() {
  try {
    const stories = localStorage.getItem("veylora_stories");
    const channels = localStorage.getItem("veylora_channels");

    if (stories) {
      state.stories = JSON.parse(stories);
    }

    if (channels) {
      state.channels = JSON.parse(channels);
    }
  } catch (error) {
    console.error("Could not load local state:", error);
  }
}

function setLoading(button, loading) {
  if (!button) return;

  if (loading) {
    button.dataset.originalText =
      button.textContent || "";
    button.disabled = true;
    button.textContent = "Please wait...";
  } else {
    button.disabled = false;
    button.textContent =
      button.dataset.originalText ||
      button.textContent ||
      "";
    delete button.dataset.originalText;
  }
}

async function apiRequest(path, options = {}) {
  const headers = {
    ...(options.body
      ? {
          "Content-Type": "application/json"
        }
      : {}),
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization =
      `Bearer ${state.token}`;
  }

  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers
    }
  );

  let data = null;

  try {
    data = await response.json();
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

/* =========================================================
   AUTHENTICATION
========================================================= */

function loginPage(error = "") {
  const app = document.getElementById("app");

  if (!app) return;

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="logo">V</div>
        </div>

        <h1>Welcome to Veylora</h1>

        <p class="auth-subtitle">
          Sign in to your account
        </p>

        ${
          error
            ? `
              <div class="error">
                ${escapeHtml(error)}
              </div>
            `
            : ""
        }

        <form id="loginForm">

          <label for="loginPhone">
            Phone number
          </label>

          <input
            id="loginPhone"
            type="tel"
            autocomplete="tel"
            placeholder="+2348012345678"
            required
          >

          <label for="loginPassword">
            Password
          </label>

          <input
            id="loginPassword"
            type="password"
            autocomplete="current-password"
            placeholder="Your password"
            required
          >

          <button
            id="loginButton"
            class="primary full"
            type="submit">
            Sign In
          </button>

        </form>

        <button
          id="showSignupButton"
          class="link-button"
          type="button">
          Don't have an account? Sign Up
        </button>

        <div class="auth-note">
          Your account is protected by
          server-side authentication.
        </div>

      </div>
    </div>
  `;

  document
    .getElementById("loginForm")
    ?.addEventListener("submit", login);

  document
    .getElementById("showSignupButton")
    ?.addEventListener("click", showSignup);
}

async function login(event) {
  event.preventDefault();

  const phone =
    document.getElementById("loginPhone")?.value.trim();

  const password =
    document.getElementById("loginPassword")?.value;

  const button =
    document.getElementById("loginButton");

  if (!phone || !password) {
    loginPage("Phone number and password are required.");
    return;
  }

  setLoading(button, true);

  try {
    const data = await apiRequest(
      "/api/auth/login",
      {
        method: "POST",
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

    await loadMessages();

    showPage("home");
  } catch (error) {
    loginPage(
      error.message || "Login failed"
    );
  } finally {
    setLoading(button, false);
  }
}

function signupPage(error = "") {
  const app = document.getElementById("app");

  if (!app) return;

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="logo">V</div>
        </div>

        <h1>Create your account</h1>

        <p class="auth-subtitle">
          Join Veylora
        </p>

        ${
          error
            ? `
              <div class="error">
                ${escapeHtml(error)}
              </div>
            `
            : ""
        }

        <form id="signupForm">

          <label for="signupName">
            Your name
          </label>

          <input
            id="signupName"
            type="text"
            autocomplete="name"
            placeholder="Your name"
            required
          >

          <label for="signupPhone">
            Phone number
          </label>

          <input
            id="signupPhone"
            type="tel"
            autocomplete="tel"
            placeholder="+2348012345678"
            required
          >

          <label for="signupPassword">
            Password
          </label>

          <input
            id="signupPassword"
            type="password"
            autocomplete="new-password"
            minlength="8"
            placeholder="At least 8 characters"
            required
          >

          <button
            id="signupButton"
            class="primary full"
            type="submit">
            Create Account
          </button>

        </form>

        <button
          id="showLoginButton"
          class="link-button"
          type="button">
          Already have an account? Sign In
        </button>

      </div>
    </div>
  `;

  document
    .getElementById("signupForm")
    ?.addEventListener("submit", signup);

  document
    .getElementById("showLoginButton")
    ?.addEventListener("click", showLogin);
}

async function signup(event) {
  event.preventDefault();

  const name =
    document.getElementById("signupName")?.value.trim();

  const phone =
    document.getElementById("signupPhone")?.value.trim();

  const password =
    document.getElementById("signupPassword")?.value;

  const button =
    document.getElementById("signupButton");

  if (!name || !phone || !password) {
    signupPage("All fields are required.");
    return;
  }

  if (password.length < 8) {
    signupPage(
      "Password must contain at least 8 characters."
    );
    return;
  }

  setLoading(button, true);

  try {
    await apiRequest(
      "/api/auth/request-otp",
      {
        method: "POST",
        body: JSON.stringify({
          phone
        })
      }
    );

    showOtpPage({
      name,
      phone,
      password
    });
  } catch (error) {
    signupPage(
      error.message ||
        "Could not request OTP"
    );
  } finally {
    setLoading(button, false);
  }
}

function showOtpPage({
  name,
  phone,
  password,
  error = ""
}) {
  const app = document.getElementById("app");

  if (!app) return;

  app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="logo">V</div>
        </div>

        <h1>Verify your number</h1>

        <p class="auth-subtitle">
          Enter the OTP sent to
          <strong>${escapeHtml(phone)}</strong>
        </p>

        ${
          error
            ? `
              <div class="error">
                ${escapeHtml(error)}
              </div>
            `
            : ""
        }

        <form id="otpForm">

          <label for="signupOtp">
            Verification code
          </label>

          <input
            id="signupOtp"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            maxlength="6"
            placeholder="123456"
            required
          >

          <button
            id="otpButton"
            class="primary full"
            type="submit">
            Verify & Create Account
          </button>

        </form>

        <button
          id="backSignupButton"
          class="link-button"
          type="button">
          Back
        </button>

        <div class="auth-note">
          Enter the six-digit code sent to your phone.
        </div>

      </div>
    </div>
  `;

  document
    .getElementById("otpForm")
    ?.addEventListener(
      "submit",
      (event) =>
        verifySignupOtp(
          event,
          {
            name,
            phone,
            password
          }
        )
    );

  document
    .getElementById("backSignupButton")
    ?.addEventListener(
      "click",
      showSignup
    );
}

async function verifySignupOtp(
  event,
  account
) {
  event.preventDefault();

  const code =
    document.getElementById("signupOtp")?.value.trim();

  const button =
    document.getElementById("otpButton");

  if (!code) {
    showOtpPage({
      ...account,
      error: "Enter the OTP."
    });
    return;
  }

  setLoading(button, true);

  try {
    await apiRequest(
      "/api/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({
          phone: account.phone,
          code
        })
      }
    );

    const data =
      await apiRequest(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: account.name,
            phone: account.phone,
            password: account.password
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

    showPage("home");
  } catch (error) {
    showOtpPage({
      ...account,
      error:
        error.message ||
        "OTP verification failed"
    });
  } finally {
    setLoading(button, false);
  }
}

function showLogin() {
  loginPage();
}

function showSignup() {
  signupPage();
}

function logout() {
  state.token = "";
  state.user = null;
  state.messages = [];

  localStorage.removeItem(
    "veylora_token"
  );

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  loginPage();
}

/* =========================================================
   SOCKET.IO
========================================================= */

function connectSocket() {
  if (!state.token) return;

  if (socket) {
    socket.disconnect();
  }

  socket = io(API_URL, {
    auth: {
      token: state.token
    },
    transports: [
      "websocket",
      "polling"
    ]
  });

  socket.on("connect", () => {
    console.log(
      "Veylora Socket.IO connected"
    );

    socket.emit(
      "conversation:join",
      state.currentConversationId
    );
  });

  socket.on(
    "connect_error",
    (error) => {
      console.error(
        "Socket.IO error:",
        error.message
      );
    }
  );

  socket.on(
    "message:new",
    (message) => {
      if (
        message.conversationId !==
        state.currentConversationId
      ) {
        return;
      }

      const exists =
        state.messages.some(
          (item) =>
            item.id === message.id
        );

      if (!exists) {
        state.messages.push(message);
        renderMessagesOnly();
      }
    }
  );

  socket.on(
    "disconnect",
    (reason) => {
      console.log(
        "Socket disconnected:",
        reason
      );
    }
  );
}

/* =========================================================
   MESSAGES
========================================================= */

async function loadMessages() {
  if (!state.token) return;

  try {
    const data =
      await apiRequest(
        `/api/messages/${encodeURIComponent(
          state.currentConversationId
        )}`
      );

    state.messages =
      Array.isArray(data.messages)
        ? data.messages
        : [];
  } catch (error) {
    console.error(
      "Could not load messages:",
      error
    );
  }
}

function renderMessagesOnly() {
  const container =
    document.querySelector(".messages");

  if (!container) return;

  if (!state.messages.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="feature-icon">💬</div>
        <h3>No messages yet</h3>
        <p>Start the conversation.</p>
      </div>
    `;
    return;
  }

  container.innerHTML =
    state.messages
      .map(
        (message) => `
          <div class="message ${
            message.senderId ===
            state.user?.id
              ? "mine"
              : ""
          }">

            <strong>
              ${
                message.senderId ===
                state.user?.id
                  ? "You"
                  : "Veylora User"
              }
            </strong>

            <p>
              ${escapeHtml(
                message.text
              )}
            </p>

            <small>
              ${escapeHtml(
                new Date(
                  message.createdAt
                ).toLocaleTimeString()
              )}
            </small>

          </div>
        `
      )
      .join("");

  container.scrollTop =
    container.scrollHeight;
}

async function sendRealMessage(text) {
  if (!state.token) {
    showLogin();
    return;
  }

  const cleanText =
    String(text || "").trim();

  if (!cleanText) return;

  try {
    if (
      socket &&
      socket.connected
    ) {
      socket.emit(
        "message:send",
        {
          conversationId:
            state.currentConversationId,
          text: cleanText
        }
      );
    } else {
      const data =
        await apiRequest(
          "/api/messages",
          {
            method: "POST",
            body: JSON.stringify({
              conversationId:
                state.currentConversationId,
              text: cleanText
            })
          }
        );

      if (data.message) {
        state.messages.push(
          data.message
        );
      }
    }

    renderMessagesOnly();
  } catch (error) {
    alert(
      error.message ||
        "Message could not be sent."
    );
  }
}

function sendMessage(event) {
  event.preventDefault();

  const input =
    document.getElementById(
      "messageInput"
    );

  if (!input) return;

  const text =
    input.value.trim();

  if (!text) return;

  input.value = "";

  sendRealMessage(text);
}

/* =========================================================
   APPLICATION SHELL
========================================================= */

function shell(active, content) {
  const app =
    document.getElementById("app");

  if (!app) return;

  app.innerHTML = `
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

      <div class="user-actions">

        <div class="user-pill">
          ${escapeHtml(
            state.user?.name ||
              "Veylora User"
          )}
        </div>

        <button
          class="logout-button"
          id="logoutButton">
          Logout
        </button>

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
              data-page="${id}">
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

  document
    .getElementById("logoutButton")
    ?.addEventListener(
      "click",
      logout
    );

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          showPage(
            button.dataset.page
          )
      );
    });
}

/* =========================================================
   HOME
========================================================= */

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
            Messaging, voice and video calls,
            Stories, Channels and AI.
          </p>

          <div class="actions">

            <button
              class="primary"
              data-open-page="chat">
              Open Chat
            </button>

            <button
              data-open-page="ai">
              Open AI
            </button>

          </div>

        </div>

        <div class="credit-card">

          <small>
            AI CREDITS
          </small>

          <strong>
            ${state.aiCredits}
          </strong>

          <span>
            available
          </span>

        </div>

      </section>

      <section>

        <h2>
          Veylora features
        </h2>

        <div class="feature-grid">

          ${[
            ["💬", "Messaging", "chat"],
            ["📞", "Voice Calls", "calls"],
            ["🎥", "Video Calls", "calls"],
            ["📸", "Stories", "stories"],
            ["📢", "Channels", "channels"],
            ["🤖", "AI", "ai"],
            ["💎", "Premium", "premium"],
            ["🛡️", "Admin", "admin"]
          ]
            .map(
              ([icon, title, page]) => `
                <article
                  class="card"
                  data-open-page="${page}">

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

  document
    .querySelectorAll(
      "[data-open-page]"
    )
    .forEach((element) => {
      element.addEventListener(
        "click",
        () =>
          showPage(
            element.dataset.openPage
          )
      );
    });
}

/* =========================================================
   CHAT
========================================================= */

function chatPage() {
  shell(
    "chat",
    `
      <section class="panel">

        <div class="panel-header">

          <div>
            <h2>Messages</h2>

            <p>
              Real-time Veylora chat
            </p>
          </div>

          <span class="online-dot">
            ● Online
          </span>

        </div>

        <div class="messages"></div>

        <form
          id="messageForm"
          class="message-form">

          <input
            id="messageInput"
            type="text"
            autocomplete="off"
            placeholder="Type a message..."
            maxlength="5000"
            required
          >

          <button
            class="primary"
            type="submit">
            Send
          </button>

        </form>

      </section>
    `
  );

  renderMessagesOnly();

  document
    .getElementById("messageForm")
    ?.addEventListener(
      "submit",
      sendMessage
    );

  if (
    socket &&
    socket.connected
  ) {
    socket.emit(
      "conversation:join",
      state.currentConversationId
    );
  }
}

/* =========================================================
   CALLS
========================================================= */

function callsPage() {
  shell(
    "calls",
    `
      <section class="panel">

        <div class="panel-header">
          <div>
            <h2>Calls</h2>
            <p>
              Voice and video calling
            </p>
          </div>
        </div>

        <div class="feature-grid">

          <article class="card">
            <div class="feature-icon">📞</div>

            <h3>Voice Call</h3>

            <p>
              Start a secure voice call.
            </p>

            <button
              class="primary"
              id="voiceCallButton">
              Start Voice Call
            </button>
          </article>

          <article class="card">
            <div class="feature-icon">🎥</div>

            <h3>Video Call</h3>

            <p>
              Start a video call.
            </p>

            <button
              class="primary"
              id="videoCallButton">
              Start Video Call
            </button>
          </article>

        </div>

        <div class="card">
          <h3>Call signaling</h3>

          <p>
            WebRTC signaling is connected
            through your Veylora backend.
          </p>

          <p>
            Add a TURN server in the backend
            environment for reliable calls
            across different networks.
          </p>
        </div>

      </section>
    `
  );

  document
    .getElementById("voiceCallButton")
    ?.addEventListener(
      "click",
      () =>
        alert(
          "Voice call interface is ready for WebRTC signaling."
        )
    );

  document
    .getElementById("videoCallButton")
    ?.addEventListener(
      "click",
      () =>
        alert(
          "Video call interface is ready for WebRTC signaling."
        )
    );
}

/* =========================================================
   STORIES
========================================================= */

function storiesPage() {
  shell(
    "stories",
    `
      <section class="panel">

        <div class="panel-header">
          <div>
            <h2>Stories</h2>
            <p>
              Share updates with your contacts.
            </p>
          </div>
        </div>

        <div class="story-list">

          ${state.stories
            .map(
              (story) => `
                <article class="card">

                  <div class="feature-icon">
                    📸
                  </div>

                  <h3>
                    ${escapeHtml(
                      story.name
                    )}
                  </h3>

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

        <form id="storyForm" class="card">

          <h3>
            Create Story
          </h3>

          <input
            id="storyText"
            type="text"
            placeholder="What's happening?"
            maxlength="500"
            required
          >

          <button
            class="primary"
            type="submit">
            Post Story
          </button>

        </form>

      </section>
    `
  );

  document
    .getElementById("storyForm")
    ?.addEventListener(
      "submit",
      (event) => {
        event.preventDefault();

        const input =
          document.getElementById(
            "storyText"
          );

        const text =
          input?.value.trim();

        if (!text) return;

        state.stories.unshift({
          name:
            state.user?.name ||
            "Veylora User",
          text,
          time: "Just now"
        });

        saveLocalState();

        storiesPage();
      }
    );
}

/* =========================================================
   CHANNELS
========================================================= */

function channelsPage() {
  shell(
    "channels",
    `
      <section class="panel">

        <div class="panel-header">
          <div>
            <h2>Channels</h2>
            <p>
              Follow creators and communities.
            </p>
          </div>
        </div>

        <div class="feature-grid">

          ${state.channels
            .map(
              (channel) => `
                <article class="card">

                  <div class="feature-icon">
                    📢
                  </div>

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
                    ${channel.followers}
                    followers
                  </small>

                  <br>

                  <button
                    class="primary">
                    Follow
                  </button>

                </article>
              `
            )
            .join("")}

        </div>

      </section>
    `
  );
}

/* =========================================================
   AI
========================================================= */

function aiPage() {
  shell(
    "ai",
    `
      <section class="panel">

        <div class="panel-header">

          <div>
            <h2>Veylora AI</h2>

            <p>
              Your AI assistant.
            </p>
          </div>

          <div class="credit-card small">
            <small>Credits</small>
            <strong>
              ${state.aiCredits}
            </strong>
          </div>

        </div>

        <form id="aiForm">

          <label for="aiPrompt">
            What do you want AI to create?
          </label>

          <textarea
            id="aiPrompt"
            rows="7"
            maxlength="10000"
            placeholder="Ask Veylora AI anything..."
            required
          ></textarea>

          <select id="aiType">

            <option value="chat">
              Chat
            </option>

            <option value="image">
              Image
            </option>

            <option value="video">
              Video
            </option>

            <option value="image-to-video">
              Image to Video
            </option>

          </select>

          <button
            id="aiButton"
            class="primary"
            type="submit">
            Generate
          </button>

        </form>

        <div
          id="aiResult"
          class="card ai-result">
          Your AI result will appear here.
        </div>

      </section>
    `
  );

  document
    .getElementById("aiForm")
    ?.addEventListener(
      "submit",
      generateAI
    );
}

async function generateAI(event) {
  event.preventDefault();

  const prompt =
    document.getElementById(
      "aiPrompt"
    )?.value.trim();

  const type =
    document.getElementById(
      "aiType"
    )?.value;

  const button =
    document.getElementById(
      "aiButton"
    );

  const result =
    document.getElementById(
      "aiResult"
    );

  if (!prompt) return;

  setLoading(button, true);

  if (result) {
    result.textContent =
      "Generating...";
  }

  try {
    const data =
      await apiRequest(
        "/api/ai/generate",
        {
          method: "POST",
          body: JSON.stringify({
            prompt,
            type
          })
        }
      );

    state.aiCredits =
      Math.max(
        0,
        state.aiCredits - 1
      );

    saveLocalState();

    if (result) {
      result.textContent =
        typeof data.result ===
        "string"
          ? data.result
          : JSON.stringify(
              data.result,
              null,
              2
            );
    }
  } catch (error) {
    if (result) {
      result.textContent =
        error.message ||
        "AI generation failed.";
    }
  } finally {
    setLoading(
      button,
      false
    );
  }
}

/* =========================================================
   PREMIUM
========================================================= */

function premiumPage() {
  shell(
    "premium",
    `
      <section class="panel">

        <div class="panel-header">
          <div>
            <h2>Veylora Premium</h2>
            <p>
              Upgrade your Veylora experience.
            </p>
          </div>
        </div>

        <div class="feature-grid">

          <article class="card">

            <div class="feature-icon">
              💎
            </div>

            <h3>Premium</h3>

            <p>
              More AI credits, advanced
              features and premium tools.
            </p>

            <button
              class="primary"
              id="premiumButton">
              Upgrade
            </button>

          </article>

          <article class="card">

            <div class="feature-icon">
              ⚡
            </div>

            <h3>AI Credits</h3>

            <p>
              Current balance:
              ${state.aiCredits}
            </p>

          </article>

        </div>

      </section>
    `
  );

  document
    .getElementById(
      "premiumButton"
    )
    ?.addEventListener(
      "click",
      () =>
        alert(
          "Premium payment is ready to connect to Paystack."
        )
    );
}

/* =========================================================
   ADMIN
========================================================= */

function adminPage() {
  shell(
    "admin",
    `
      <section class="panel">

        <div class="panel-header">

          <div>
            <h2>Admin</h2>

            <p>
              Veylora administration.
            </p>
          </div>

        </div>

        <div class="feature-grid">

          <article class="card">
            <div class="feature-icon">
              👤
            </div>

            <h3>
              Account
            </h3>

            <p>
              ${escapeHtml(
                state.user?.name ||
                  "User"
              )}
            </p>

            <p>
              ${escapeHtml(
                state.user?.phone ||
                  ""
              )}
            </p>
          </article>

          <article class="card">
            <div class="feature-icon">
              🔌
            </div>

            <h3>
              Backend
            </h3>

            <p>
              ${escapeHtml(
                API_URL
              )}
            </p>
          </article>

          <article class="card">
            <div class="feature-icon">
              💬
            </div>

            <h3>
              Real-time
            </h3>

            <p>
              ${
                socket?.connected
                  ? "Socket.IO connected"
                  : "Socket.IO disconnected"
              }
            </p>
          </article>

        </div>

      </section>
    `
  );
}

/* =========================================================
   PAGE ROUTER
========================================================= */

function showPage(page) {
  if (!state.token || !state.user) {
    loginPage();
    return;
  }

  switch (page) {
    case "home":
      homePage();
      break;

    case "chat":
      chatPage();
      break;

    case "calls":
      callsPage();
      break;

    case "stories":
      storiesPage();
      break;

    case "channels":
      channelsPage();
      break;

    case "ai":
      aiPage();
      break;

    case "premium":
      premiumPage();
      break;

    case "admin":
      adminPage();
      break;

    default:
      homePage();
  }
}

/* =========================================================
   SESSION RESTORE
========================================================= */

async function restoreSession() {
  loadLocalState();

  if (!state.token) {
    loginPage();
    return;
  }

  try {
    const data =
      await apiRequest(
        "/api/auth/me"
      );

    state.user =
      data.user;

    connectSocket();

    await loadMessages();

    showPage("home");
  } catch (error) {
    console.warn(
      "Session restore failed:",
      error
    );

    localStorage.removeItem(
      "veylora_token"
    );

    state.token = "";
    state.user = null;

    loginPage();
  }
}

/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    restoreSession();
  }
);