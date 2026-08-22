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
    Number(localStorage.getItem("veylora_ai_credits")) || 0,

  messages: [],

  currentConversationId: "general",

  dashboard: {
    followers: 0,
    subscribers: 0,
    likes: 0,
    walletBalance: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalMessages: 0,
    revenue: 0
  },

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
      followers: 0
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

function formatNumber(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-US", {
    notation: number >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1
  }).format(number);
}

function formatMoney(value) {
  const number = Number(value) || 0;

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(number);
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
    const stories =
      localStorage.getItem("veylora_stories");

    const channels =
      localStorage.getItem("veylora_channels");

    const dashboard =
      localStorage.getItem("veylora_dashboard");

    if (stories) {
      state.stories = JSON.parse(stories);
    }

    if (channels) {
      state.channels = JSON.parse(channels);
    }

    if (dashboard) {
      state.dashboard = {
        ...state.dashboard,
        ...JSON.parse(dashboard)
      };
    }
  } catch (error) {
    console.error(
      "Could not load local state:",
      error
    );
  }
}

function saveDashboardLocally() {
  localStorage.setItem(
    "veylora_dashboard",
    JSON.stringify(state.dashboard)
  );
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

function showError(message) {
  console.error(message);

  if (typeof window !== "undefined") {
    alert(message);
  }
}

/* =========================================================
   API
========================================================= */

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
        data?.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

/* =========================================================
   DASHBOARD DATA
========================================================= */

async function loadDashboardData() {
  if (!state.token) return;

  try {
    const data =
      await apiRequest(
        "/api/dashboard"
      );

    const dashboard =
      data.dashboard ||
      data.stats ||
      data;

    state.dashboard = {
      ...state.dashboard,

      followers:
        Number(
          dashboard.followers ??
          dashboard.followerCount ??
          0
        ),

      subscribers:
        Number(
          dashboard.subscribers ??
          dashboard.channelSubscribers ??
          0
        ),

      likes:
        Number(
          dashboard.likes ??
          dashboard.totalLikes ??
          0
        ),

      walletBalance:
        Number(
          dashboard.walletBalance ??
          dashboard.wallet?.balance ??
          0
        ),

      totalUsers:
        Number(
          dashboard.totalUsers ??
          dashboard.users ??
          0
        ),

      activeUsers:
        Number(
          dashboard.activeUsers ??
          0
        ),

      totalMessages:
        Number(
          dashboard.totalMessages ??
          dashboard.messages ??
          0
        ),

      revenue:
        Number(
          dashboard.revenue ??
          0
        )
    };

    if (
      dashboard.aiCredits !== undefined
    ) {
      state.aiCredits =
        Number(
          dashboard.aiCredits
        ) || 0;
    }

    saveDashboardLocally();
    saveLocalState();
  } catch (error) {
    console.warn(
      "Dashboard API unavailable:",
      error.message
    );
  }
}

/* =========================================================
   AUTHENTICATION
========================================================= */

function loginPage(error = "") {
  const app =
    document.getElementById("app");

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
    ?.addEventListener(
      "submit",
      login
    );

  document
    .getElementById("showSignupButton")
    ?.addEventListener(
      "click",
      showSignup
    );
}

async function login(event) {
  event.preventDefault();

  const phone =
    document
      .getElementById("loginPhone")
      ?.value.trim();

  const password =
    document
      .getElementById("loginPassword")
      ?.value;

  const button =
    document.getElementById(
      "loginButton"
    );

  if (!phone || !password) {
    loginPage(
      "Phone number and password are required."
    );

    return;
  }

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

    if (
      data.aiCredits !== undefined
    ) {
      state.aiCredits =
        Number(
          data.aiCredits
        ) || 0;
    }

    localStorage.setItem(
      "veylora_token",
      state.token
    );

    saveLocalState();

    connectSocket();

    await loadMessages();

    await loadDashboardData();

    showPage("home");
  } catch (error) {
    loginPage(
      error.message ||
        "Login failed"
    );
  } finally {
    setLoading(
      button,
      false
    );
  }
}

function signupPage(error = "") {
  const app =
    document.getElementById("app");

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
    ?.addEventListener(
      "submit",
      signup
    );

  document
    .getElementById("showLoginButton")
    ?.addEventListener(
      "click",
      showLogin
    );
}

async function signup(event) {
  event.preventDefault();

  const name =
    document
      .getElementById("signupName")
      ?.value.trim();

  const phone =
    document
      .getElementById("signupPhone")
      ?.value.trim();

  const password =
    document
      .getElementById("signupPassword")
      ?.value;

  const button =
    document.getElementById(
      "signupButton"
    );

  if (!name || !phone || !password) {
    signupPage(
      "All fields are required."
    );

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
    setLoading(
      button,
      false
    );
  }
}

function showOtpPage({
  name,
  phone,
  password,
  error = ""
}) {
  const app =
    document.getElementById("app");

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
          <strong>
            ${escapeHtml(phone)}
          </strong>
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

      </div>
    </div>
  `;

  document
    .getElementById("otpForm")
    ?.addEventListener(
      "submit",
      event =>
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
    .getElementById(
      "backSignupButton"
    )
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
    document
      .getElementById("signupOtp")
      ?.value.trim();

  const button =
    document.getElementById(
      "otpButton"
    );

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

    state.token =
      data.token;

    state.user =
      data.user;

    state.aiCredits =
      Number(
        data.aiCredits ?? 0
      );

    localStorage.setItem(
      "veylora_token",
      state.token
    );

    saveLocalState();

    connectSocket();

    await loadDashboardData();

    showPage("home");
  } catch (error) {
    showOtpPage({
      ...account,
      error:
        error.message ||
        "OTP verification failed"
    });
  } finally {
    setLoading(
      button,
      false
    );
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
        "Socket.IO error:",
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

        renderMessagesOnly();
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

  if (!container) return;

  if (!state.messages.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="feature-icon">
          💬
        </div>

        <h3>
          No messages yet
        </h3>

        <p>
          Start the conversation.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    state.messages
      .map(
        message => `
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
    showError(
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
    .getElementById(
      "logoutButton"
    )
    ?.addEventListener(
      "click",
      logout
    );

  document
    .querySelectorAll(
      "[data-page]"
    )
    .forEach(button => {
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
   NEW DASHBOARD HOMEPAGE
========================================================= */

function homePage() {
  const userName =
    state.user?.name ||
    "Veylora User";

  const dashboard =
    state.dashboard;

  shell(
    "home",
    `
      <div class="dashboard">

        <!-- CHATS -->

        <section class="dash-card">

          <div class="dash-title">
            Chats
          </div>

          <div class="dash-search">
            ⌕ &nbsp; Search chats...
          </div>

          <div class="dash-tabs">
            <b>All Chats</b>
            <span>Unread</span>
            <span>Groups</span>
            <span>Channels</span>
          </div>

          ${[
            [
              "FG",
              "Family Group",
              "Mom: Dinner at 7pm",
              "9:00 AM"
            ],
            [
              "JD",
              "John Doe",
              "Hey! How are you?",
              "9:00 AM"
            ],
            [
              "SS",
              "Study Squad",
              "You: Notes for exam",
              "9:10 AM"
            ],
            [
              "V",
              "Veylora Team",
              "New update available",
              "8:50 AM"
            ],
            [
              "BF",
              "Best Friends",
              "📷 Photo",
              "8:20 AM"
            ],
            [
              "DC",
              "Design Community",
              "Alex: New challenge",
              "7:45 AM"
            ],
            [
              "JS",
              userName,
              "Typing...",
              ""
            ]
          ]
            .map(
              ([
                av,
                name,
                msg,
                time
              ]) => `
                <div class="dash-row">

                  <div class="person">

                    <div class="avatar">
                      ${escapeHtml(av)}
                    </div>

                    <div>
                      <strong>
                        ${escapeHtml(name)}
                      </strong>

                      <span>
                        ${escapeHtml(msg)}
                      </span>
                    </div>

                  </div>

                  <span class="dash-muted">
                    ${escapeHtml(time)}
                  </span>

                </div>
              `
            )
            .join("")}

        </section>

        <!-- CALLS -->

        <section class="dash-card">

          <div class="dash-title">
            Voice &amp; Video Calls
          </div>

          <div
            class="dash-muted"
            style="text-align:center">
            ⌁ End-to-End Encrypted
          </div>

          <div
            style="
              text-align:center;
              margin:9px 0 5px
            ">

            <strong>
              ${escapeHtml(userName)}
            </strong>

            <div class="dash-muted">
              08:24
            </div>

          </div>

          <div class="video-placeholder">

            <div class="video-caption">

              <strong>
                Live video preview
              </strong>

              <span>
                Secure Veylora call
              </span>

            </div>

          </div>

          <div class="control-row">

            <button
              class="control"
              title="Camera">
              ▣
            </button>

            <button
              class="control"
              title="Microphone">
              ◉
            </button>

            <button
              class="control"
              title="Mute">
              ⌁
            </button>

            <button
              class="control end"
              title="End call">
              ☎
            </button>

          </div>

          <button
            class="primary full"
            style="margin-top:8px"
            data-open-page="calls">
            Open Calls
          </button>

        </section>

        <!-- SOCIAL FEED -->

        <section class="dash-card">

          <div class="dash-title">
            Social Feed (TikTok Style)
          </div>

          <div class="dash-tabs">
            <b>Following</b>
            <span>For You</span>
          </div>

          <div class="video-placeholder">

            <div class="video-caption">

              <strong>
                Nature Lover
              </strong>

              <span>
                The beauty of nature is endless<br>
                #travel #nature #adventure
              </span>

            </div>

          </div>

          <div class="dash-row">

            <span class="dash-muted">
              ♥ ${formatNumber(
                dashboard.likes
              )}
              &nbsp; 💬 0
              &nbsp; ↗ 0
            </span>

            <button
              data-open-page="stories">
              Open Feed
            </button>

          </div>

        </section>

        <!-- AI CREATION -->

        <section class="dash-card">

          <div class="dash-title">
            AI Creation Center
          </div>

          <div class="ai-box">

            <div class="dash-tabs">
              <b>Text to Video</b>
              <span>Image to Video</span>
              <span>AI Styles</span>
            </div>

            <textarea
              id="dashboardAiPrompt"
              style="min-height:74px"
              placeholder="Describe your idea..."
            >A futuristic city at night with flying cars and neon lights</textarea>

            <select
              id="dashboardAiStyle">

              <option>
                ◉ Cyberpunk
              </option>

              <option>
                Cinematic
              </option>

              <option>
                Anime
              </option>

              <option>
                Realistic
              </option>

            </select>

            <select
              id="dashboardAiDuration">

              <option>
                ◷ 5 Seconds
              </option>

              <option>
                10 Seconds
              </option>

              <option>
                15 Seconds
              </option>

            </select>

            <button
              class="generate"
              id="dashboardGenerateButton">
              Generate Video
            </button>

            <div
              id="dashboardAiStatus"
              class="dash-muted"
              style="text-align:center">
              Credits: ${state.aiCredits}
            </div>

            <div class="creation-strip">

              <div class="thumb"></div>
              <div class="thumb"></div>
              <div class="thumb"></div>

            </div>

          </div>

        </section>

        <!-- STORIES -->

        <section class="dash-card">

          <div class="dash-title">
            Stories
          </div>

          <div class="story-circles">

            ${[
              "You",
              "John",
              "Jane",
              "Team",
              "Veylora"
            ]
              .map(
                name => `
                  <div
                    class="story-circle">

                    <div class="avatar">
                      ${escapeHtml(
                        name.slice(0, 1)
                      )}
                    </div>

                    <div>
                      ${escapeHtml(name)}
                    </div>

                  </div>
                `
              )
              .join("")}

          </div>

          <div class="story-hero">

            <div class="video-caption">

              <strong>
                Enjoying the beautiful sunset ❤️
              </strong>

              <span>
                Veylora Story • Just now
              </span>

            </div>

          </div>

          <button
            class="full"
            style="margin-top:8px"
            data-open-page="stories">
            Send message…
          </button>

        </section>

      </div>

      <!-- LOWER GRID -->

      <div class="lower-grid">

        <!-- GROUPS -->

        <section class="dash-card">

          <div class="dash-title">
            Groups
          </div>

          <div class="dash-row">

            <div class="person">

              <div class="avatar sm">
                FG
              </div>

              <div>
                <strong>
                  Family Group
                </strong>

                <span>
                  25 members
                </span>
              </div>

            </div>

            <span>
              ⋮
            </span>

          </div>

          <div class="dash-row">

            <div class="person">

              <div class="avatar sm">
                M
              </div>

              <div>
                <strong>
                  Mom
                </strong>

                <span>
                  Dinner at 7pm. Don't be late!
                </span>
              </div>

            </div>

            <span class="dash-muted">
              9:04 AM
            </span>

          </div>

          <div class="dash-row">

            <div class="person">

              <div class="avatar sm">
                D
              </div>

              <div>
                <strong>
                  Dad
                </strong>

                <span>
                  Okay, I'll be home soon.
                </span>
              </div>

            </div>

            <span class="dash-muted">
              9:31 AM
            </span>

          </div>

          <div class="dash-row">

            <div class="person">

              <div class="avatar sm">
                Y
              </div>

              <div>
                <strong>
                  You
                </strong>

                <span>
                  I'll help with the setup.
                </span>
              </div>

            </div>

            <span class="dash-muted">
              9:31 AM
            </span>

          </div>

          <button
            class="full"
            data-open-page="chat">
            Type a message…
          </button>

        </section>

        <!-- CHANNELS -->

        <section class="dash-card">

          <div class="dash-title">
            Channels
          </div>

          <div class="dash-row">

            <div class="person">

              <div class="avatar sm">
                V
              </div>

              <div>
                <strong>
                  Veylora Updates
                </strong>

                <span>
                  ${formatNumber(
                    dashboard.subscribers
                  )}
                  subscribers
                </span>
              </div>

            </div>

            <span>
              +
            </span>

          </div>

          <div
            class="card"
            style="padding:10px;margin:7px 0">

            <strong style="font-size:10px">
              🚀 New Update is Live!
            </strong>

            <p
              style="
                font-size:8px;
                margin:6px 0
              ">

              • Better performance<br>
              • New AI tools<br>
              • Bug fixes<br>
              • And more!

            </p>

            <span class="dash-muted">
              ♥ ${formatNumber(
                dashboard.likes
              )}
              &nbsp; 💬 0
              &nbsp; 9:30 AM
            </span>

          </div>

          <button
            class="full"
            data-open-page="channels">
            UNMUTE
          </button>

        </section>

        <!-- COMMUNITIES -->

        <section class="dash-card">

          <div class="dash-title">
            Communities
          </div>

          ${[
            [
              "V",
              "Veylora Community",
              "8 groups • 4 channels"
            ],
            [
              "G",
              "General Chat",
              "Active now"
            ],
            [
              "G",
              "Gaming Group",
              "1.2K members"
            ],
            [
              "A",
              "Announcements",
              "Channel • 95K subscribers"
            ],
            [
              "D",
              "Design Inspiration",
              "Channel • 12K subscribers"
            ]
          ]
            .map(
              ([av, n, s]) => `
                <div class="dash-row">

                  <div class="person">

                    <div class="avatar sm">
                      ${escapeHtml(av)}
                    </div>

                    <div>

                      <strong>
                        ${escapeHtml(n)}
                      </strong>

                      <span>
                        ${escapeHtml(s)}
                      </span>

                    </div>

                  </div>

                  <span>
                    ›
                  </span>

                </div>
              `
            )
            .join("")}

        </section>

        <!-- OFFLINE -->

        <section class="dash-card">

          <div class="dash-title">
            Offline Mode
          </div>

          <div
            style="
              text-align:center;
              padding:8px
            ">

            <div style="font-size:34px">
              ⌁
            </div>

            <strong>
              Hybrid Offline/Online
            </strong>

            <div class="dash-muted">
              Messages can be queued while offline
            </div>

          </div>

          ${[
            [
              "Messages",
              "Your messages are saved locally"
            ],
            [
              "Media",
              "Photos & videos can be saved"
            ],
            [
              "Will sync when online",
              "Everything will be updated"
            ]
          ]
            .map(
              ([a, b]) => `
                <div class="dash-row">

                  <span
                    style="
                      color:var(--green)
                    ">
                    ✓
                  </span>

                  <div
                    style="
                      flex:1
                    ">

                    <strong
                      style="
                        font-size:9px
                      ">
                      ${escapeHtml(a)}
                    </strong>

                    <span class="dash-muted">
                      ${escapeHtml(b)}
                    </span>

                  </div>

                </div>
              `
            )
            .join("")}

        </section>

        <!-- SECURITY -->

        <section class="dash-card">

          <div class="dash-title">
            End-to-End Security
          </div>

          <div
            style="
              text-align:center;
              padding:5px
            ">

            <div
              style="
                font-size:44px;
                color:var(--green)
              ">
              ♢
            </div>

            <strong
              style="
                color:#62ef9c
              ">
              Your privacy is our priority
            </strong>

            <p
              style="
                font-size:9px;
                margin:5px 0
              ">
              Secure messaging and calls
            </p>

          </div>

          ${[
            "Secure account authentication",
            "Encrypted transport",
            "Privacy controls"
          ]
            .map(
              text => `
                <div class="dash-row">

                  <span
                    style="
                      color:var(--green)
                    ">
                    ✓
                  </span>

                  <span
                    style="
                      font-size:9px
                    ">
                    ${escapeHtml(text)}
                  </span>

                </div>
              `
            )
            .join("")}

        </section>

        <!-- MULTI DEVICE -->

        <section class="dash-card">

          <div class="dash-title">
            Multi-Device
          </div>

          ${[
            [
              "Android Phone",
              "This device"
            ],
            [
              "Veylora Web",
              "Last active 2 min ago"
            ],
            [
              "Windows Desktop",
              "Last active 1 hour ago"
            ],
            [
              "Android Tablet",
              "Last active yesterday"
            ]
          ]
            .map(
              ([a, b]) => `
                <div class="dash-row">

                  <div class="person">

                    <div class="avatar sm">
                      ▣
                    </div>

                    <div>

                      <strong>
                        ${escapeHtml(a)}
                      </strong>

                      <span>
                        ${escapeHtml(b)}
                      </span>

                    </div>

                  </div>

                  <span>
                    ›
                  </span>

                </div>
              `
            )
            .join("")}

          <button class="full">
            Link New Device
          </button>

        </section>

        <!-- PAYMENTS -->

        <section class="dash-card">

          <div class="dash-title">
            Payments (Localized)
          </div>

          <div class="statbox">

            <span>
              Wallet Balance
            </span>

            <b>
              ${formatMoney(
                dashboard.walletBalance
              )}
            </b>

          </div>

          <div
            class="statline"
            style="margin-top:7px">

            <button
              class="statbox"
              id="topUpButton">
              ⊕
              <span>
                Top Up
              </span>
            </button>

            <button
              class="statbox"
              id="sendPaymentButton">
              ➤
              <span>
                Send
              </span>
            </button>

            <button
              class="statbox"
              id="requestPaymentButton">
              ♙
              <span>
                Request
              </span>
            </button>

            <button
              class="statbox"
              id="paymentHistoryButton">
              ◷
              <span>
                History
              </span>
            </button>

          </div>

          <p style="font-size:8px">
            Wallet balance comes from your
            backend when available.
          </p>

        </section>

        <!-- AI TOOLS -->

        <section class="dash-card admin-mini">

          <div class="dash-title">
            AI POWERED TOOLS
          </div>

          <p
            style="
              text-align:center;
              font-size:9px;
              margin:0 0 8px
            ">
            Create. Imagine. Inspire.
          </p>

          <div
            class="feature-grid"
            style="
              grid-template-columns:
                1fr 1fr 1fr;
              gap:5px
            ">

            ${[
              ["🎬", "Text to Video"],
              ["🖼️", "Image to Video"],
              ["🎨", "AI Styles"],
              ["🌄", "AI Image"],
              ["💬", "AI Chat"],
              ["🔊", "AI Voice"]
            ]
              .map(
                ([icon, title]) => `
                  <button
                    class="card ai-tool"
                    style="padding:7px"
                    data-open-page="ai">

                    <div
                      class="feature-icon"
                      style="font-size:20px">
                      ${icon}
                    </div>

                    <strong
                      style="font-size:8px">
                      ${escapeHtml(title)}
                    </strong>

                  </button>
                `
              )
              .join("")}

          </div>

        </section>

        <!-- REAL ADMIN STATISTICS -->

        <section class="dash-card admin-mini">

          <div class="dash-title">
            Admin Dashboard (Web)
          </div>

          <div class="statline">

            <div class="statbox">
              <span>Total Users</span>
              <b>
                ${formatNumber(
                  dashboard.totalUsers
                )}
              </b>
            </div>

            <div class="statbox">
              <span>Active Users</span>
              <b>
                ${formatNumber(
                  dashboard.activeUsers
                )}
              </b>
            </div>

            <div class="statbox">
              <span>Messages</span>
              <b>
                ${formatNumber(
                  dashboard.totalMessages
                )}
              </b>
            </div>

            <div class="statbox">
              <span>Revenue</span>
              <b>
                ${formatMoney(
                  dashboard.revenue
                )}
              </b>
            </div>

          </div>

          <div
            class="admin-chart"
            style="margin-top:8px">
          </div>

          <div
            class="dash-muted"
            style="margin-top:7px">

            Live statistics are loaded
            from the Veylora backend.

          </div>

        </section>

        <!-- PREMIUM -->

        <section class="dash-card admin-mini">

          <div class="dash-title">
            Premium Plans (Localized)
          </div>

          <div
            class="feature-grid"
            style="
              grid-template-columns:
                repeat(3,1fr);
              gap:6px
            ">

            ${[
              [
                "Go",
                "₦10,000",
                "Basic Power for Everyone"
              ],
              [
                "Pro",
                "₦30,000",
                "More Power. More Possibilities."
              ],
              [
                "Ultra",
                "₦50,000",
                "Ultimate Power. No Limits."
              ]
            ]
              .map(
                ([name, price, description]) => `
                  <div
                    class="plan-card"
                    style="padding:9px">

                    <strong>
                      ${escapeHtml(name)}
                    </strong>

                    <div class="price">
                      ${escapeHtml(price)}
                      <small>
                        /month
                      </small>
                    </div>

                    <span class="dash-muted">
                      ${escapeHtml(description)}
                    </span>

                    <ul>

                      <li>
                        ✓ Messaging
                      </li>

                      <li>
                        ✓ Calls
                      </li>

                      <li>
                        ✓ Stories
                      </li>

                      <li>
                        ✓ AI Features
                      </li>

                      <li>
                        ✓ Cloud Storage
                      </li>

                    </ul>

                    <button
                      class="primary full"
                      data-premium-plan="${escapeHtml(
                        name
                      )}">
                      Get ${escapeHtml(name)}
                    </button>

                  </div>
                `
              )
              .join("")}

          </div>

        </section>

        <!-- FEATURES -->

        <section class="dash-card admin-mini">

          <div class="dash-title">
            MORE POWERFUL FEATURES
          </div>

          <div class="feature-list">

            ${[
              [
                "☎",
                "Phone Number Login (All Countries)",
                "OTP via SMS or WhatsApp"
              ],
              [
                "⌁",
                "Hybrid Offline/Online Mode",
                "Works offline and syncs when online"
              ],
              [
                "⌕",
                "Universal Search",
                "Search messages, groups, users and media"
              ],
              [
                "♟",
                "Smart Notifications",
                "Never miss what matters"
              ],
              [
                "▣",
                "Backup & Restore",
                "Secure cloud backup"
              ],
              [
                "◉",
                "Privacy Controls",
                "Your data, your control"
              ],
              [
                "◈",
                "Custom Themes",
                "Light, Dark & Custom"
              ],
              [
                "文",
                "Multi-Language",
                "Many languages supported"
              ]
            ]
              .map(
                ([icon, title, description]) => `
                  <div class="feature-item">

                    <div class="icon">
                      ${icon}
                    </div>

                    <div>

                      <b>
                        ${escapeHtml(title)}
                      </b>

                      <span>
                        ${escapeHtml(description)}
                      </span>

                    </div>

                  </div>
                `
              )
              .join("")}

          </div>

        </section>

      </div>

      <div class="footer-tech">

        <div class="tech">
          BUILT WITH &nbsp; Ionic 7
        </div>

        <div class="tech">
          Angular
        </div>

        <div class="tech">
          TypeScript
        </div>

        <div class="tech">
          Capacitor
        </div>

        <div class="tech">
          BACKEND &nbsp; Node.js
        </div>

        <div class="tech">
          Express
        </div>

        <div class="tech">
          MongoDB
        </div>

        <div class="tech">
          Socket.io
        </div>

        <div class="tech">
          Redis
        </div>

        <div class="tech">
          PAYMENTS &amp; SECURITY
          &nbsp; Paystack • Flutterwave • SSL/TLS
        </div>

        <div class="tech">
          Android • Web • Tablet
        </div>

      </div>
    `
  );

  /* =======================================================
     DASHBOARD BUTTONS
  ======================================================= */

  document
    .querySelectorAll(
      "[data-open-page]"
    )
    .forEach(element => {
      element.addEventListener(
        "click",
        () => {
          showPage(
            element.dataset.openPage
          );
        }
      );
    });

  /* AI */

  document
    .getElementById(
      "dashboardGenerateButton"
    )
    ?.addEventListener(
      "click",
      async () => {
        const prompt =
          document
            .getElementById(
              "dashboardAiPrompt"
            )
            ?.value.trim();

        const button =
          document.getElementById(
            "dashboardGenerateButton"
          );

        const status =
          document.getElementById(
            "dashboardAiStatus"
          );

        if (!prompt) {
          alert(
            "Describe what you want to create."
          );

          return;
        }

        setLoading(
          button,
          true
        );

        if (status) {
          status.textContent =
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
                  type: "video"
                })
              }
            );

          state.aiCredits =
            Math.max(
              0,
              state.aiCredits - 1
            );

          saveLocalState();

          if (status) {
            status.textContent =
              data.result
                ? "Generation complete."
                : "Generation request sent.";
          }
        } catch (error) {
          if (status) {
            status.textContent =
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
    );

  /* PAYMENTS */

  document
    .getElementById(
      "topUpButton"
    )
    ?.addEventListener(
      "click",
      () => {
        showPage("premium");
      }
    );

  document
    .getElementById(
      "sendPaymentButton"
    )
    ?.addEventListener(
      "click",
      () => {
        alert(
          "Payment transfer interface will connect to your backend."
        );
      }
    );

  document
    .getElementById(
      "requestPaymentButton"
    )
    ?.addEventListener(
      "click",
      () => {
        alert(
          "Payment request interface will connect to your backend."
        );
      }
    );

  document
    .getElementById(
      "paymentHistoryButton"
    )
    ?.addEventListener(
      "click",
      () => {
        alert(
          "Payment history will be loaded from the backend."
        );
      }
    );

  /* PREMIUM PLANS */

  document
    .querySelectorAll(
      "[data-premium-plan]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          const plan =
            button.dataset
              .premiumPlan;

          alert(
            `Premium ${plan} checkout will connect to your payment backend.`
          );
        }
      );
    });
}

/* =========================================================
   CHAT PAGE
========================================================= */

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
    .getElementById(
      "messageForm"
    )
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

            <h2>
              Calls
            </h2>

            <p>
              Voice and video calling
            </p>

          </div>

        </div>

        <div class="feature-grid">

          <article class="card">

            <div class="feature-icon">
              📞
            </div>

            <h3>
              Voice Call
            </h3>

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

            <div class="feature-icon">
              🎥
            </div>

            <h3>
              Video Call
            </h3>

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

          <h3>
            Call signaling
          </h3>

          <p>
            WebRTC signaling can be connected
            through your Veylora backend.
          </p>

          <p>
            Add a TURN server to the backend
            for reliable calls across networks.
          </p>

        </div>

      </section>
    `
  );

  document
    .getElementById(
      "voiceCallButton"
    )
    ?.addEventListener(
      "click",
      () =>
        alert(
          "Voice call interface is ready for WebRTC signaling."
        )
    );

  document
    .getElementById(
      "videoCallButton"
    )
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

            <h2>
              Stories
            </h2>

            <p>
              Share updates with your contacts.
            </p>

          </div>

        </div>

        <div class="story-list">

          ${state.stories
            .map(
              story => `
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

        <form
          id="storyForm"
          class="card">

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
    .getElementById(
      "storyForm"
    )
    ?.addEventListener(
      "submit",
      event => {
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

          time:
            "Just now"
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

            <h2>
              Channels
            </h2>

            <p>
              Follow creators and communities.
            </p>

          </div>

        </div>

        <div class="feature-grid">

          ${state.channels
            .map(
              channel => `
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
                    ${formatNumber(
                      channel.followers
                    )}
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

            <h2>
              Veylora AI
            </h2>

            <p>
              Your AI assistant.
            </p>

          </div>

          <div class="credit-card small">

            <small>
              Credits
            </small>

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
    .getElementById(
      "aiForm"
    )
    ?.addEventListener(
      "submit",
      generateAI
    );
}

async function generateAI(event) {
  event.preventDefault();

  const prompt =
    document
      .getElementById(
        "aiPrompt"
      )
      ?.value.trim();

  const type =
    document
      .getElementById(
        "aiType"
      )
      ?.value;

  const button =
    document.getElementById(
      "aiButton"
    );

  const result =
    document.getElementById(
      "aiResult"
    );

  if (!prompt) return;

  setLoading(
    button,
    true
  );

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

            <h2>
              Veylora Premium
            </h2>

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

            <h3>
              Premium
            </h3>

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

            <h3>
              AI Credits
            </h3>

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
          "Premium checkout will connect to your payment backend."
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

            <h2>
              Admin
            </h2>

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
              ${escapeHtml(API_URL)}
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

          <article class="card">

            <div class="feature-icon">
              📊
            </div>

            <h3>
              Users
            </h3>

            <p>
              ${formatNumber(
                state.dashboard.totalUsers
              )}
            </p>

          </article>

          <article class="card">

            <div class="feature-icon">
              💰
            </div>

            <h3>
              Revenue
            </h3>

            <p>
              ${formatMoney(
                state.dashboard.revenue
              )}
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
  if (
    !state.token ||
    !state.user
  ) {
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

    if (
      data.aiCredits !== undefined
    ) {
      state.aiCredits =
        Number(
          data.aiCredits
        ) || 0;
    }

    connectSocket();

    await loadMessages();

    await loadDashboardData();

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
   ONLINE / OFFLINE STATUS
========================================================= */

window.addEventListener(
  "online",
  () => {
    console.log(
      "Veylora is online."
    );

    if (
      state.token &&
      !socket
    ) {
      connectSocket();
    }

    if (state.token) {
      loadDashboardData();
    }
  }
);

window.addEventListener(
  "offline",
  () => {
    console.log(
      "Veylora is offline."
    );
  }
);

/* =========================================================
   START APP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    restoreSession();
  }
);