import "./style.css";
import { io } from "socket.io-client";

/*
|--------------------------------------------------------------------------
| Backend configuration
|--------------------------------------------------------------------------
|
| Android emulator:
|   http://10.0.2.2:8080
|
| Physical Android phone:
|   Use your computer's LAN IP, for example:
|   http://192.168.1.100:8080
|
| Production:
|   Set VITE_API_URL to your HTTPS backend URL.
|
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://10.0.2.2:8080";

let socket = null;

const state = {
  user: null,
  token: localStorage.getItem("veylora_token") || "",

  otpPhone: "",

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

  currentConversationId: "general"
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

/*
|--------------------------------------------------------------------------
| Utility
|--------------------------------------------------------------------------
*/

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
    const credits =
      localStorage.getItem(
        "veylora_ai_credits"
      );

    if (credits) {
      state.aiCredits =
        Number(credits) || 1240;
    }

    const stories =
      localStorage.getItem(
        "veylora_stories"
      );

    if (stories) {
      state.stories =
        JSON.parse(stories);
    }

    const channels =
      localStorage.getItem(
        "veylora_channels"
      );

    if (channels) {
      state.channels =
        JSON.parse(channels);
    }
  } catch {
    console.log(
      "Local state could not be loaded."
    );
  }
}

function setLoading(button, loading) {
  if (!button) return;

  button.disabled = loading;

  if (loading) {
    button.dataset.originalText =
      button.textContent;

    button.textContent =
      "Please wait...";
  } else {
    button.textContent =
      button.dataset.originalText ||
      button.textContent;

    delete button.dataset.originalText;
  }
}

async function apiRequest(
  path,
  options = {}
) {
  const headers = {
    ...(options.body
      ? {
          "Content-Type":
            "application/json"
        }
      : {}),
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization =
      `Bearer ${state.token}`;
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

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

function loginPage(error = "") {
  document.getElementById("app").innerHTML = `
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

        <form onsubmit="login(event)">

          <label>
            Phone number
          </label>

          <input
            id="loginPhone"
            type="tel"
            autocomplete="tel"
            placeholder="+2348012345678"
            required
          >

          <label>
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
          class="link-button"
          onclick="showSignup()">
          Don't have an account? Sign Up
        </button>

        <div class="auth-note">
          Your account is protected by
          server-side authentication.
        </div>

      </div>
    </div>
  `;
}

window.login = async function(event) {
  event.preventDefault();

  const phone =
    document
      .getElementById("loginPhone")
      .value
      .trim();

  const password =
    document
      .getElementById("loginPassword")
      .value;

  const button =
    document.getElementById(
      "loginButton"
    );

  setLoading(button, true);

  try {
    const data =
      await apiRequest(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            phone,
            password
          })
        }
      );

    state.token =
      data.token;

    state.user =
      data.user;

    localStorage.setItem(
      "veylora_token",
      state.token
    );

    connectSocket();

    await loadMessages();

    showPage("home");
  } catch (error) {
    loginPage(
      error.message ||
      "Login failed"
    );
  } finally {
    setLoading(button, false);
  }
};

function signupPage(error = "") {
  document.getElementById("app").innerHTML = `
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

        <form onsubmit="signup(event)">

          <label>
            Your name
          </label>

          <input
            id="signupName"
            type="text"
            autocomplete="name"
            placeholder="Your name"
            required
          >

          <label>
            Phone number
          </label>

          <input
            id="signupPhone"
            type="tel"
            autocomplete="tel"
            placeholder="+2348012345678"
            required
          >

          <label>
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
          class="link-button"
          onclick="showLogin()">
          Already have an account? Sign In
        </button>

      </div>
    </div>
  `;
}

window.signup = async function(event) {
  event.preventDefault();

  const name =
    document
      .getElementById("signupName")
      .value
      .trim();

  const phone =
    document
      .getElementById("signupPhone")
      .value
      .trim();

  const password =
    document
      .getElementById("signupPassword")
      .value;

  const button =
    document.getElementById(
      "signupButton"
    );

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

    state.otpPhone =
      phone;

    signupOtpPage({
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
};

function signupOtpPage({
  name,
  phone,
  password
}) {
  document.getElementById("app").innerHTML = `
    <div class="auth-page">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="logo">V</div>
        </div>

        <h1>Verify your number</h1>

        <p class="auth-subtitle">
          Enter the OTP sent to
          <strong>
            ${escapeHtml(phone)}
          </strong>
        </p>

        <form
          onsubmit="verifySignupOtp(event)"
          data-name="${escapeHtml(name)}"
          data-phone="${escapeHtml(phone)}"
          data-password="${escapeHtml(password)}"
        >

          <label>
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
          class="link-button"
          onclick="showSignup()">
          Back
        </button>

        <div class="auth-note">
          The OTP is verified by your backend.
        </div>

      </div>
    </div>
  `;
}

window.verifySignupOtp =
  async function(event) {
    event.preventDefault();

    const form =
      event.currentTarget;

    const name =
      form.dataset.name;

    const phone =
      form.dataset.phone;

    const password =
      form.dataset.password;

    const code =
      document
        .getElementById("signupOtp")
        .value
        .trim();

    const button =
      document.getElementById(
        "otpButton"
      );

    setLoading(button, true);

    try {
      await apiRequest(
        "/api/auth/verify-otp",
        {
          method: "POST",
          body: JSON.stringify({
            phone,
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
              name,
              phone,
              password
            })
          }
        );

      state.token =
        data.token;

      state.user =
        data.user;

      localStorage.setItem(
        "veylora_token",
        state.token
      );

      connectSocket();

      showPage("home");
    } catch (error) {
      signupOtpPage({
        name,
        phone,
        password
      });

      const card =
        document.querySelector(
          ".auth-card"
        );

      if (card) {
        const message =
          document.createElement(
            "div"
          );

        message.className =
          "error";

        message.textContent =
          error.message ||
          "OTP verification failed";

        card.insertBefore(
          message,
          card.querySelector("form")
        );
      }
    } finally {
      setLoading(
        button,
        false
      );
    }
  };

window.showLogin =
  function() {
    loginPage();
  };

window.showSignup =
  function() {
    signupPage();
  };

window.logout =
  function() {
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
  };

/*
|--------------------------------------------------------------------------
| Socket.IO
|--------------------------------------------------------------------------
*/

function connectSocket() {
  if (!state.token) {
    return;
  }

  if (socket) {
    socket.disconnect();
  }

  socket =
    io(API_URL, {
      auth: {
        token: state.token
      },
      transports: [
        "websocket",
        "polling"
      ]
    });

  socket.on(
    "connect",
    () => {
      console.log(
        "Veylora Socket.IO connected"
      );

      socket.emit(
        "conversation:join",
        state.currentConversationId
      );
    }
  );

  socket.on(
    "connect_error",
    error => {
      console.error(
        "Socket connection failed:",
        error.message
      );
    }
  );

  socket.on(
    "message:new",
    message => {
      if (
        message.conversationId !==
        state.currentConversationId
      ) {
        return;
      }

      const exists =
        state.messages.some(
          item =>
            item.id === message.id
        );

      if (!exists) {
        state.messages.push(
          message
        );

        if (
          document.querySelector(
            ".messages"
          )
        ) {
          renderMessagesOnly();
        }
      }
    }
  );

  socket.on(
    "disconnect",
    reason => {
      console.log(
        "Socket disconnected:",
        reason
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| Messages
|--------------------------------------------------------------------------
*/

async function loadMessages() {
  if (!state.token) {
    return;
  }

  try {
    const data =
      await apiRequest(
        `/api/messages/${encodeURIComponent(
          state.currentConversationId
        )}`
      );

    state.messages =
      Array.isArray(
        data.messages
      )
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
    document.querySelector(
      ".messages"
    );

  if (!container) {
    return;
  }

  container.innerHTML =
    state.messages
      .map(message => `
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
      `)
      .join("");
}

async function sendRealMessage(
  text
) {
  if (!state.token) {
    showLogin();
    return;
  }

  const cleanText =
    text.trim();

  if (!cleanText) {
    return;
  }

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

      state.messages.push(
        data.message
      );
    }

    renderMessagesOnly();
  } catch (error) {
    alert(
      error.message ||
      "Message could not be sent."
    );
  }
}

window.sendMessage =
  async function(event) {
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

    input.value = "";

    await sendRealMessage(text);
  };

/*
|--------------------------------------------------------------------------
| Main application shell
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

        <div class="logo">
          V
        </div>

        <div>
          <strong>
            Veylora
          </strong>

          <small>
            Connect • Create • Share
          </small>
        </div>

      </div>

      <div class="user-actions">

        <div class="user-pill">
          ${
            escapeHtml(
              state.user?.name ||
              "Veylora User"
            )
          }
        </div>

        <button
          class="logout-button"
          onclick="logout()">
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
            Messaging, voice and video calls,
            Stories, Status, Channels and AI.
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

function chatPage() {
  shell(
    "chat",
    `
      <section class="panel">

        <div class="panel-header">

          <div>
            <h2>
              Messages
            </h2>

            <