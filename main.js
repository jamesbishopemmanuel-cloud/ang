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

  dashboard: {
    chats: [],
    followers: 0,
    subscribers: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    walletBalance: 0,
    transactions: [],
    communities: [],
    devices: [],
    admin: {
      totalUsers: 0,
      activeUsers: 0,
      messages: 0,
      revenue: 0
    },
    premium: []
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
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  return new Intl.NumberFormat().format(number);
}

function formatCurrency(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "₦0.00";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(number);
}

function formatCompactNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0";
  }

  if (number >= 1000000000) {
    return `${(number / 1000000000).toFixed(1)}B`;
  }

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(1)}K`;
  }

  return String(number);
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

    if (stories) {
      const parsedStories = JSON.parse(stories);

      if (Array.isArray(parsedStories)) {
        state.stories = parsedStories;
      }
    }

    if (channels) {
      const parsedChannels = JSON.parse(channels);

      if (Array.isArray(parsedChannels)) {
        state.channels = parsedChannels;
      }
    }
  } catch (error) {
    console.error(
      "Could not load local state:",
      error
    );
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
   DASHBOARD DATA
========================================================= */

function resetDashboardData() {
  state.dashboard = {
    chats: [],
    followers: 0,
    subscribers: 0,
    likes: 0,
    shares: 0,
    comments: 0,
    walletBalance: 0,

    transactions: [],

    communities: [],

    devices: [],

    admin: {
      totalUsers: 0,
      activeUsers: 0,
      messages: 0,
      revenue: 0
    },

    premium: []
  };
}

function normalizeDashboardData(data) {
  const source =
    data?.dashboard ||
    data?.data ||
    data ||
    {};

  state.dashboard = {
    chats: Array.isArray(source.chats)
      ? source.chats
      : [],

    followers:
      Number(source.followers) || 0,

    subscribers:
      Number(source.subscribers) || 0,

    likes:
      Number(source.likes) || 0,

    shares:
      Number(source.shares) || 0,

    comments:
      Number(source.comments) || 0,

    walletBalance:
      Number(
        source.walletBalance ??
        source.wallet?.balance ??
        0
      ) || 0,

    transactions:
      Array.isArray(source.transactions)
        ? source.transactions
        : [],

    communities:
      Array.isArray(source.communities)
        ? source.communities
        : [],

    devices:
      Array.isArray(source.devices)
        ? source.devices
        : [],

    admin: {
      totalUsers:
        Number(
          source.admin?.totalUsers ??
          source.totalUsers ??
          0
        ) || 0,

      activeUsers:
        Number(
          source.admin?.activeUsers ??
          source.activeUsers ??
          0
        ) || 0,

      messages:
        Number(
          source.admin?.messages ??
          source.totalMessages ??
          0
        ) || 0,

      revenue:
        Number(
          source.admin?.revenue ??
          source.revenue ??
          0
        ) || 0
    },

    premium:
      Array.isArray(source.premium)
        ? source.premium
        : []
  };
}

async function loadDashboardData() {
  if (!state.token) {
    resetDashboardData();
    return;
  }

  try {
    const data =
      await apiRequest(
        "/api/dashboard"
      );

    normalizeDashboardData(data);
  } catch (error) {
    console.warn(
      "Dashboard API unavailable:",
      error.message
    );

    /*
      Important:
      We deliberately do NOT insert fake figures here.

      Until the backend endpoint exists, values remain
      zero / empty.
    */

    resetDashboardData();
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
      data.token || "";

    state.user =
      data.user || null;

    localStorage.setItem(
      "veylora_token",
      state.token
    );

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

  setLoading(
    button,
    true
  );

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
    document
      .getElementById(
        "signupOtp"
      )
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

  setLoading(
    button,
    true
  );

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
      data.token || "";

    state.user =
      data.user || null;

    localStorage.setItem(
      "veylora_token",
      state.token
    );

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

  resetDashboardData();

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
  if (!state.token) {
    return;
  }

  if (socket) {
    socket.disconnect();
  }

  socket = io(
    API_URL,
    {
      auth: {
        token: state.token
      },

      transports: [
        "websocket",
        "polling"
      ]
    }
  );

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
        state.messages.push(
          message
        );

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

  if (!input) {
    return;
  }

  const text =
    input.value.trim();

  if (!text) {
    return;
  }

  input.value = "";

  sendRealMessage(text);
}

/* =========================================================
   APPLICATION SHELL
========================================================= */

function shell(
  active,
  content
) {
  const app =
    document.getElementById(
      "app"
    );

  if (!app) {
    return;
  }

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
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () =>
            showPage(
              button.dataset.page
            )
        );
      }
    );
}

/* =========================================================
   HOME — NEW DASHBOARD
========================================================= */

function homePage() {
  const dashboard =
    state.dashboard;

  const chats =
    Array.isArray(
      dashboard.chats
    )
      ? dashboard.chats
      : [];

  const communities =
    Array.isArray(
      dashboard.communities
    )
      ? dashboard.communities
      : [];

  const transactions =
    Array.isArray(
      dashboard.transactions
    )
      ? dashboard.transactions
      : [];

  const devices =
    Array.isArray(
      dashboard.devices
    )
      ? dashboard.devices
      : [];

  const userName =
    state.user?.name ||
    "Veylora User";

  shell(
    "home",
    `
      <div class="dashboard">

        <!-- ================= CHAT ================= -->

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

          ${
            chats.length
              ? chats
                  .map(
                    (chat) => `
                      <div class="dash-row">

                        <div class="person">

                          <div class="avatar">
                            ${escapeHtml(
                              chat.avatar ||
                                chat.initials ||
                                String(
                                  chat.name ||
                                    "V"
                                )
                                  .slice(0, 2)
                                  .toUpperCase()
                            )}
                          </div>

                          <div>
                            <strong>
                              ${escapeHtml(
                                chat.name ||
                                  "Conversation"
                              )}
                            </strong>

                            <span>
                              ${escapeHtml(
                                chat.lastMessage ||
                                  ""
                              )}
                            </span>
                          </div>

                        </div>

                        <span class="dash-muted">
                          ${escapeHtml(
                            chat.time || ""
                          )}
                        </span>

                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="empty-state">

                  <div class="feature-icon">
                    💬
                  </div>

                  <h3>
                    No chats yet
                  </h3>

                  <p>
                    Your real conversations
                    will appear here.
                  </p>

                </div>
              `
          }

        </section>

        <!-- ================= CALLS ================= -->

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
              ${escapeHtml(
                userName
              )}
            </strong>

            <div class="dash-muted">
              Ready
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

        <!-- ================= SOCIAL FEED ================= -->

        <section class="dash-card">

          <div class="dash-title">
            Social Feed
          </div>

          <div class="dash-tabs">
            <b>Following</b>
            <span>For You</span>
          </div>

          <div class="video-placeholder">

            <div class="video-caption">

              <strong>
                Veylora Social
              </strong>

              <span>
                Your real posts, likes,
                comments and shares will
                appear here.
              </span>

            </div>

          </div>

          <div class="dash-row">

            <span class="dash-muted">
              ♥ ${formatCompactNumber(
                dashboard.likes
              )}
              &nbsp;
              💬 ${formatCompactNumber(
                dashboard.comments
              )}
              &nbsp;
              ↗ ${formatCompactNumber(
                dashboard.shares
              )}
            </span>

            <button
              data-open-page="stories">
              Open Feed
            </button>

          </div>

        </section>

        <!-- ================= AI ================= -->

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
              style="min-height:74px"
              placeholder="Describe your idea..."
            ></textarea>

            <select>
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

            <select>
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
              data-open-page="ai">
              Generate Video
            </button>

            <div
              class="dash-muted"
              style="text-align:center">

              Credits:
              ${formatNumber(
                state.aiCredits
              )}

            </div>

            <div class="creation-strip">
              <div class="thumb"></div>
              <div class="thumb"></div>
              <div class="thumb"></div>
            </div>

          </div>

        </section>

        <!-- ================= STORIES ================= -->

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
                (name) => `
                  <div class="story-circle">

                    <div class="avatar">
                      ${escapeHtml(
                        name.slice(
                          0,
                          1
                        )
                      )}
                    </div>

                    <div>
                      ${escapeHtml(
                        name
                      )}
                    </div>

                  </div>
                `
              )
              .join("")}

          </div>

          <div class="story-hero">

            <div class="video-caption">

              <strong>
                Share your next story ❤️
              </strong>

              <span>
                Your real Veylora Stories
              </span>

            </div>

          </div>

          <button
            class="full"
            style="margin-top:8px"
            data-open-page="stories">
            Open Stories
          </button>

        </section>

      </div>

      <!-- =================================================
           LOWER DASHBOARD
      ================================================= -->

      <div class="lower-grid">

        <!-- ================= GROUPS ================= -->

        <section class="dash-card">

          <div class="dash-title">
            Groups
          </div>

          ${
            communities.length
              ? communities
                  .slice(0, 5)
                  .map(
                    (community) => `
                      <div class="dash-row">

                        <div class="person">

                          <div class="avatar sm">
                            ${escapeHtml(
                              community.initials ||
                                String(
                                  community.name ||
                                    "G"
                                )
                                  .slice(0, 2)
                                  .toUpperCase()
                            )}
                          </div>

                          <div>

                            <strong>
                              ${escapeHtml(
                                community.name ||
                                  "Community"
                              )}
                            </strong>

                            <span>
                              ${escapeHtml(
                                community.subtitle ||
                                  `${formatNumber(
                                    community.members ||
                                      0
                                  )} members`
                              )}
                            </span>

                          </div>

                        </div>

                        <span>
                          ›
                        </span>

                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="empty-state">
                  <div class="feature-icon">
                    👥
                  </div>

                  <p>
                    No groups yet.
                  </p>
                </div>
              `
          }

          <button
            class="full"
            data-open-page="chat">
            Type a message…
          </button>

        </section>

        <!-- ================= CHANNELS ================= -->

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
            style="
              padding:10px;
              margin:7px 0
            ">

            <strong
              style="font-size:10px">
              Veylora Updates
            </strong>

            <p
              style="
                font-size:8px;
                margin:6px 0
              ">

              Follow Veylora for
              official updates.

            </p>

            <span class="dash-muted">

              Subscribers:
              ${formatCompactNumber(
                dashboard.subscribers
              )}

            </span>

          </div>

          <button
            class="full"
            data-open-page="channels">
            OPEN CHANNELS
          </button>

        </section>

        <!-- ================= COMMUNITIES ================= -->

        <section class="dash-card">

          <div class="dash-title">
            Communities
          </div>

          ${
            communities.length
              ? communities
                  .map(
                    (community) => `
                      <div class="dash-row">

                        <div class="person">

                          <div class="avatar sm">
                            ${escapeHtml(
                              community.initials ||
                                "C"
                            )}
                          </div>

                          <div>

                            <strong>
                              ${escapeHtml(
                                community.name ||
                                  "Community"
                              )}
                            </strong>

                            <span>
                              ${escapeHtml(
                                community.subtitle ||
                                  ""
                              )}
                            </span>

                          </div>

                        </div>

                        <span>
                          ›
                        </span>

                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="empty-state">

                  <div class="feature-icon">
                    🌐
                  </div>

                  <p>
                    No communities yet.
                  </p>

                </div>
              `
          }

        </section>

        <!-- ================= OFFLINE ================= -->

        <section class="dash-card">

          <div class="dash-title">
            Offline Mode
          </div>

          <div
            style="
              text-align:center;
              padding:8px
            ">

            <div
              style="font-size:34px">
              ⌁
            </div>

            <strong>
              Offline-ready
            </strong>

            <div class="dash-muted">
              Saved data can sync when
              internet returns.
            </div>

          </div>

          ${[
            [
              "Messages",
              "Your messages are saved"
            ],
            [
              "Media",
              "Saved media can sync later"
            ],
            [
              "Sync",
              "Updates when online"
            ]
          ]
            .map(
              ([title, text]) => `
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
                      style="font-size:9px">
                      ${escapeHtml(
                        title
                      )}
                    </strong>

                    <span
                      class="dash-muted">
                      ${escapeHtml(
                        text
                      )}
                    </span>

                  </div>

                </div>
              `
            )
            .join("")}

        </section>

        <!-- ================= SECURITY ================= -->

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
              Secure Veylora communication.
            </p>

          </div>

          ${[
            "Secure authentication",
            "Protected messaging",
            "Privacy controls"
          ]
            .map(
              (text) => `
                <div class="dash-row">

                  <span
                    style="
                      color:var(--green)
                    ">
                    ✓
                  </span>

                  <span
                    style="font-size:9px">
                    ${escapeHtml(
                      text
                    )}
                  </span>

                </div>
              `
            )
            .join("")}

        </section>

        <!-- ================= DEVICES ================= -->

        <section class="dash-card">

          <div class="dash-title">
            Multi-Device
          </div>

          ${
            devices.length
              ? devices
                  .map(
                    (device) => `
                      <div class="dash-row">

                        <div class="person">

                          <div class="avatar sm">
                            ▣
                          </div>

                          <div>

                            <strong>
                              ${escapeHtml(
                                device.name ||
                                  "Device"
                              )}
                            </strong>

                            <span>
                              ${escapeHtml(
                                device.status ||
                                  ""
                              )}
                            </span>

                          </div>

                        </div>

                        <span>
                          ›
                        </span>

                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="empty-state">

                  <div class="feature-icon">
                    📱
                  </div>

                  <p>
                    No linked devices.
                  </p>

                </div>
              `
          }

          <button class="full">
            Link New Device
          </button>

        </section>

        <!-- ================= PAYMENTS ================= -->

        <section class="dash-card">

          <div class="dash-title">
            Payments
          </div>

          <div class="statbox">

            <span>
              Wallet Balance
            </span>

            <b>
              ${formatCurrency(
                dashboard.walletBalance
              )}
            </b>

          </div>

          <div
            class="statline"
            style="margin-top:7px">

            <div class="statbox">
              ⊕
              <span>
                Top Up
              </span>
            </div>

            <div class="statbox">
              ➤
              <span>
                Send
              </span>
            </div>

            <div class="statbox">
              ♙
              <span>
                Request
              </span>
            </div>

            <div class="statbox">
              ◷
              <span>
                History
              </span>
            </div>

          </div>

          <p
            style="font-size:8px">
            Recent Transactions
          </p>

          ${
            transactions.length
              ? transactions
                  .slice(0, 5)
                  .map(
                    (transaction) => `
                      <div class="dash-row">

                        <span>
                          ${escapeHtml(
                            transaction.description ||
                              transaction.title ||
                              "Transaction"
                          )}
                        </span>

                        <span>
                          ${escapeHtml(
                            transaction.amountFormatted ||
                              formatCurrency(
                                transaction.amount ||
                                  0
                              )
                          )}
                        </span>

                      </div>
                    `
                  )
                  .join("")
              : `
                <div class="empty-state">

                  <p>
                    No transactions yet.
                  </p>

                </div>
              `
          }

        </section>

        <!-- ================= AI TOOLS ================= -->

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
                      ${escapeHtml(
                        title
                      )}
                    </strong>

                  </button>
                `
              )
              .join("")}

          </div>

        </section>

        <!-- ================= ADMIN ================= -->

        <section class="dash-card admin-mini">

          <div class="dash-title">
            Admin Dashboard
          </div>

          <div class="statline">

            <div class="statbox">

              <span>
                Total Users
              </span>

              <b>
                ${formatCompactNumber(
                  dashboard.admin.totalUsers
                )}
              </b>

            </div>

            <div class="statbox">

              <span>
                Active Users
              </span>

              <b>
                ${formatCompactNumber(
                  dashboard.admin.activeUsers
                )}
              </b>

            </div>

            <div class="statbox">

              <span>
                Messages
              </span>

              <b>
                ${formatCompactNumber(
                  dashboard.admin.messages
                )}
              </b>

            </div>

            <div class="statbox">

              <span>
                Revenue
              </span>

              <b>
                ${formatCurrency(
                  dashboard.admin.revenue
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

            Live figures are supplied by
            the Veylora backend.

          </div>

        </section>

        <!-- ================= PREMIUM ================= -->

        <section class="dash-card admin-mini">

          <div class="dash-title">
            Premium Plans
          </div>

          <div
            class="feature-grid"
            style="
              grid-template-columns:
                repeat(3,1fr);
              gap:6px
            ">

            ${
              dashboard.premium.length
                ? dashboard.premium
                    .map(
                      (plan) => `
                        <div
                          class="plan-card"
                          style="padding:9px">

                          <strong>
                            ${escapeHtml(
                              plan.name ||
                                "Plan"
                            )}
                          </strong>

                          <div class="price">

                            ${escapeHtml(
                              plan.priceFormatted ||
                                formatCurrency(
                                  plan.price ||
                                    0
                                )
                            )}

                            <small>
                              /month
                            </small>

                          </div>

                          <span class="dash-muted">
                            ${escapeHtml(
                              plan.description ||
                                ""
                            )}
                          </span>

                          <button
                            class="primary full"
                            style="margin-top:7px">
                            Get ${escapeHtml(
                              plan.name ||
                                "Plan"
                            )}
                          </button>

                        </div>
                      `
                    )
                    .join("")
                : `
                  <div
                    class="empty-state"
                    style="
                      grid-column:1/-1
                    ">

                    <div
                      class="feature-icon">
                      💎
                    </div>

                    <p>
                      Premium plans will
                      appear here.
                    </p>

                  </div>
                `
            }

          </div>

        </section>

        <!-- ================= FEATURES ================= -->

        <section class="dash-card admin-mini">

          <div class="dash-title">
            MORE POWERFUL FEATURES
          </div>

          <div class="feature-list">

            ${[
              [
                "☎",
                "Phone Number Login",
                "OTP via SMS or WhatsApp"
              ],

              [
                "⌁",
                "Hybrid Offline/Online Mode",
                "Works offline and syncs online"
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
                        ${escapeHtml(
                          title
                        )}
                      </b>

                      <span>
                        ${escapeHtml(
                          description
                        )}
                      </span>

                    </div>

                  </div>
                `
              )
              .join("")}

          </div>

        </section>

      </div>

      <!-- ================= FOOTER ================= -->

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
        </div>

        <div class="tech">
          Android • Web • Tablet
        </div>

      </div>
    `
  );

  document
    .querySelectorAll(
      "[data-open-page]"
    )
    .forEach(
      (element) => {
        element.addEventListener(
          "click",
          () =>
            showPage(
              element.dataset.openPage
            )
        );
      }
    );
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
      (event) => {
        event.preventDefault();

        const input =
          document.getElementById(
            "storyText"
          );

        const text =
          input?.value.trim();

        if (!text) {
          return;
        }

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
              ${formatNumber(
                state.aiCredits
              )}
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

  if (!prompt) {
    return;
  }

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
              ${formatNumber(
                state.aiCredits
              )}
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
  const admin =
    state.dashboard.admin;

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

          <article class="card">

            <div class="feature-icon">
              👥
            </div>

            <h3>
              Users
            </h3>

            <p>
              ${formatNumber(
                admin.totalUsers
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
              ${formatCurrency(
                admin.revenue
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
      data.user || null;

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

    resetDashboardData();

    loginPage();
  }
}

/* =========================================================
   ONLINE / OFFLINE STATUS
========================================================= */

window.addEventListener(
  "online",
  async () => {
    console.log(
      "Veylora is online"
    );

    if (state.token) {
      await loadDashboardData();

      if (
        document.querySelector(
          ".dashboard"
        )
      ) {
        homePage();
      }
    }
  }
);

window.addEventListener(
  "offline",
  () => {
    console.log(
      "Veylora is offline"
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