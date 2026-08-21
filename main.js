import "./style.css";

/*
 * VEYLORA PRODUCTION FRONTEND
 *
 * This file talks to your production backend.
 *
 * Configure your backend URL with:
 *
 * VITE_API_URL=https://YOUR-BACKEND-DOMAIN.com
 *
 * For Capacitor/Android, you can also replace API_BASE_URL
 * with your actual HTTPS backend URL.
 */

const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_URL) ||
  "https://YOUR-BACKEND-DOMAIN.com";

const state = {
  user: {
    id: null,
    name: "Veylora User",
    phone: ""
  },

  token: localStorage.getItem("veylora_token") || "",

  aiCredits: 0,

  stories: [],

  channels: [],

  messages: [],

  selectedChatId: null,

  loading: false
};

/* =========================================================
   API
========================================================= */

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      `Request failed (${response.status})`
    );
  }

  return data;
}

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

function showError(error) {
  console.error(error);

  alert(
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function setToken(token) {
  state.token = token || "";

  if (state.token) {
    localStorage.setItem(
      "veylora_token",
      state.token
    );
  } else {
    localStorage.removeItem(
      "veylora_token"
    );
  }
}

function formatTime(value) {
  if (!value) return "Now";

  try {
    return new Date(value).toLocaleTimeString(
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

/* =========================================================
   AUTH
========================================================= */

async function loadCurrentUser() {
  if (!state.token) return false;

  try {
    const data = await api(
      "/api/auth/me"
    );

    state.user = {
      ...state.user,
      ...(data.user || data)
    };

    return true;
  } catch (error) {
    console.warn(
      "Authentication session expired.",
      error
    );

    setToken("");
    return false;
  }
}

window.login = async function () {
  const phone = prompt(
    "Enter your phone number:"
  );

  if (!phone) return;

  try {
    const data = await api(
      "/api/auth/request-otp",
      {
        method: "POST",
        body: JSON.stringify({
          phone
        })
      }
    );

    alert(
      data.message ||
      "OTP sent successfully."
    );

    const otp = prompt(
      "Enter the OTP you received:"
    );

    if (!otp) return;

    const verified = await api(
      "/api/auth/verify-otp",
      {
        method: "POST",
        body: JSON.stringify({
          phone,
          otp
        })
      }
    );

    setToken(
      verified.token ||
      verified.accessToken
    );

    state.user = {
      ...state.user,
      ...(verified.user || {})
    };

    await loadAppData();

    showPage("home");

  } catch (error) {
    showError(error);
  }
};

window.logout = function () {
  setToken("");

  state.user = {
    id: null,
    name: "Veylora User",
    phone: ""
  };

  state.messages = [];

  showPage("home");
};

/* =========================================================
   DATA
========================================================= */

async function loadAppData() {
  if (!state.token) return;

  try {
    const [
      profile,
      stories,
      channels
    ] = await Promise.all([
      api("/api/auth/me"),
      api("/api/stories"),
      api("/api/channels")
    ]);

    state.user = {
      ...state.user,
      ...(profile.user || profile)
    };

    state.stories =
      stories.stories ||
      stories.data ||
      stories ||
      [];

    state.channels =
      channels.channels ||
      channels.data ||
      channels ||
      [];

    state.aiCredits =
      Number(
        profile.user?.aiCredits ??
        profile.aiCredits ??
        0
      );

  } catch (error) {
    console.error(
      "Could not load application data:",
      error
    );
  }
}

/* =========================================================
   LAYOUT
========================================================= */

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

function shell(active, content) {
  document.getElementById("app").innerHTML = `
    <header class="topbar">

      <div class="brand">

        <div class="logo">
          V
        </div>

        <div>
          <strong>Veylora</strong>

          <small>
            Connect • Create • Share
          </small>
        </div>

      </div>

      <div class="user-pill">

        ${
          state.token
            ? escapeHtml(
                state.user.name ||
                "Veylora User"
              )
            : `<button onclick="login()">
                Login
              </button>`
        }

      </div>

    </header>

    <nav class="navigation">

      ${navigation.map(
        ([id, label]) => `
          <button
            class="${active === id ? "active" : ""}"
            onclick="showPage('${id}')">

            ${label}

          </button>
        `
      ).join("")}

    </nav>

    <main>
      ${content}
    </main>
  `;
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
          ["💬", "Messaging", "chat"],
          ["📞", "Voice Calls", "calls"],
          ["🎥", "Video Calls", "calls"],
          ["📸", "Stories", "stories"],
          ["📢", "Channels", "channels"],
          ["🤖", "AI", "ai"],
          ["💎", "Premium", "premium"]
        ].map(
          ([icon, title, page]) => `
            <article
              class="card"
              onclick="showPage('${page}')">

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
        ).join("")}

      </div>

    </section>
  `
  );
}

/* =========================================================
   CHAT
========================================================= */

async function loadMessages() {
  if (!state.token) return;

  try {
    const data = await api(
      "/api/messages"
    );

    state.messages =
      data.messages ||
      data.data ||
      data ||
      [];

  } catch (error) {
    showError(error);
  }
}

function chatPage() {
  shell(
    "chat",
    `

    <section class="panel">

      <h2>
        Messages
      </h2>

      ${
        !state.token
          ? `
            <div class="notice">

              <strong>
                Login required
              </strong>

              <p>
                Login with your phone number
                to send real messages.
              </p>

              <button
                class="primary"
                onclick="login()">
                Login
              </button>

            </div>
          `
          : `
            <div class="messages">

              ${
                state.messages.length
                  ? state.messages.map(
                      message => `
                        <div class="message">

                          <strong>
                            ${escapeHtml(
                              message.senderName ||
                              message.from ||
                              "User"
                            )}
                          </strong>

                          <p>
                            ${escapeHtml(
                              message.text ||
                              message.content ||
                              ""
                            )}
                          </p>

                          <small>
                            ${formatTime(
                              message.createdAt ||
                              message.time
                            )}
                          </small>

                        </div>
                      `
                    ).join("")
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
          `
      }

    </section>
  `
  );
}

window.sendMessage = async function (
  event
) {
  event.preventDefault();

  if (!state.token) {
    alert("Please login first.");
    return;
  }

  const input =
    document.getElementById(
      "messageInput"
    );

  const text =
    input?.value.trim();

  if (!text) return;

  input.disabled = true;

  try {
    const data = await api(
      "/api/messages",
      {
        method: "POST",

        body: JSON.stringify({
          text,
          chatId:
            state.selectedChatId
        })
      }
    );

    const message =
      data.message ||
      data.data;

    if (message) {
      state.messages.push(message);
    } else {
      await loadMessages();
    }

    chatPage();

  } catch (error) {
    input.disabled = false;
    showError(error);
  }
};

/* =========================================================
   CALLS / WEBRTC
========================================================= */

function callsPage() {
  shell(
    "calls",
    `

    <section class="panel">

      <h2>
        Calls
      </h2>

      <p>
        Real voice and video calling.
      </p>

      ${
        !state.token
          ? `
            <div class="notice">

              Login before starting a call.

              <br><br>

              <button
                class="primary"
                onclick="login()">
                Login
              </button>

            </div>
          `
          : `
            <div class="call-grid">

              <button
                class="call-card"
                onclick="startCall('voice')">

                <span>
                  📞
                </span>

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

                <span>
                  🎥
                </span>

                <strong>
                  Video Call
                </strong>

                <small>
                  FREE
                </small>

              </button>

            </div>

            <div class="notice">

              <strong>
                Real calling
              </strong>

              <p>
                Calls use your backend for
                signaling and WebRTC for the
                media connection.
              </p>

            </div>
          `
      }

    </section>
  `
  );
}

window.startCall = async function (
  type
) {
  if (!state.token) {
    alert("Please login first.");
    return;
  }

  const recipientId = prompt(
    "Enter the recipient user ID:"
  );

  if (!recipientId) return;

  try {
    const data = await api(
      "/api/calls",
      {
        method: "POST",

        body: JSON.stringify({
          recipientId,
          type
        })
      }
    );

    /*
     * The backend should return something like:
     *
     * {
     *   callId: "...",
     *   type: "video",
     *   roomId: "...",
     *   iceServers: [...]
     * }
     */

    const call =
      data.call ||
      data;

    openCallScreen(call);

  } catch (error) {
    showError(error);
  }
};

function openCallScreen(call) {
  shell(
    "calls",
    `

    <section class="panel">

      <h2>
        ${
          call.type === "video"
            ? "Video Call"
            : "Voice Call"
        }
      </h2>

      ${
        call.type === "video"
          ? `
            <video
              id="remoteVideo"
              autoplay
              playsinline
              style="
                width:100%;
                max-height:400px;
                background:#000;
              ">
            </video>

            <video
              id="localVideo"
              autoplay
              muted
              playsinline
              style="
                width:140px;
                background:#000;
              ">
            </video>
          `
          : `
            <div class="notice">
              📞 Voice call in progress
            </div>
          `
      }

      <div class="actions">

        <button
          onclick="toggleMute()">
          🎙️ Mute
        </button>

        <button
          onclick="toggleSpeaker()">
          🔊 Speaker
        </button>

        <button
          class="primary"
          onclick="endCall('${escapeHtml(
            call.callId ||
            call.id ||
            ""
          )}')">
          ☎️ End Call
        </button>

      </div>

    </section>
  `
  );

  /*
   * Your actual WebRTC implementation should
   * connect here using the call ID and ICE
   * servers returned by the backend.
   */

  if (
    typeof window.initializeWebRTC ===
    "function"
  ) {
    window.initializeWebRTC(call);
  }
}

window.toggleMute = function () {
  if (
    typeof window.toggleWebRTCMute ===
    "function"
  ) {
    window.toggleWebRTCMute();
  } else {
    alert(
      "WebRTC client is not loaded yet."
    );
  }
};

window.toggleSpeaker = function () {
  if (
    typeof window.toggleWebRTCSpeaker ===
    "function"
  ) {
    window.toggleWebRTCSpeaker();
  } else {
    alert(
      "Speaker control is handled by the WebRTC client."
    );
  }
};

window.endCall = async function (
  callId
) {
  try {
    if (callId) {
      await api(
        `/api/calls/${encodeURIComponent(
          callId
        )}/end`,
        {
          method: "POST"
        }
      );
    }
  } catch (error) {
    console.error(error);
  }

  if (
    typeof window.closeWebRTC ===
    "function"
  ) {
    window.closeWebRTC();
  }

  showPage("calls");
};

/* =========================================================
   STORIES
========================================================= */

async function loadStories() {
  try {
    const data = await api(
      "/api/stories"
    );

    state.stories =
      data.stories ||
      data.data ||
      data ||
      [];
  } catch (error) {
    console.error(error);
  }
}

function storiesPage() {
  shell(
    "stories",
    `

    <section class="panel">

      <h2>
        Stories & Status
      </h2>

      ${
        state.token
          ? `
            <form
              onsubmit="createStory(event)">

              <textarea
                id="storyText"
                placeholder="What's happening?"
                required></textarea>

              <button
                class="primary">
                📸 Post Story
              </button>

            </form>
          `
          : `
            <button
              class="primary"
              onclick="login()">
              Login to post
            </button>
          `
      }

      <div class="stories-list">

        ${
          state.stories.map(
            story => `
              <article
                class="story-card">

                <strong>
                  ${escapeHtml(
                    story.name ||
                    story.user?.name ||
                    "User"
                  )}
                </strong>

                <p>
                  ${escapeHtml(
                    story.text ||
                    story.content ||
                    ""
                  )}
                </p>

                <small>
                  ${formatTime(
                    story.createdAt ||
                    story.time
                  )}
                </small>

              </article>
            `
          ).join("")
        }

      </div>

    </section>
  `
  );
}

window.createStory = async function (
  event
) {
  event.preventDefault();

  if (!state.token) {
    alert("Please login first.");
    return;
  }

  const input =
    document.getElementById(
      "storyText"
    );

  const text =
    input.value.trim();

  if (!text) return;

  try {
    const data = await api(
      "/api/stories",
      {
        method: "POST",

        body: JSON.stringify({
          text
        })
      }
    );

    const story =
      data.story ||
      data.data;

    if (story) {
      state.stories.unshift(story);
    } else {
      await loadStories();
    }

    storiesPage();

  } catch (error) {
    showError(error);
  }
};

/* =========================================================
   CHANNELS
========================================================= */

async function loadChannels() {
  try {
    const data = await api(
      "/api/channels"
    );

    state.channels =
      data.channels ||
      data.data ||
      data ||
      [];
  } catch (error) {
    console.error(error);
  }
}

function channelsPage() {
  shell(
    "channels",
    `

    <section class="panel">

      <h2>
        Channels
      </h2>

      ${
        state.token
          ? `
            <button
              class="primary"
              onclick="createChannel()">
              ＋ Create Channel
            </button>
          `
          : `
            <button
              class="primary"
              onclick="login()">
              Login
            </button>
          `
      }

      <div class="channel-list">

        ${
          state.channels.map(
            channel => `
              <article
                class="channel-card">

                <h3>
                  ${escapeHtml(
                    channel.name
                  )}
                </h3>

                <p>
                  ${escapeHtml(
                    channel.description ||
                    ""
                  )}
                </p>

                <small>
                  ${
                    Number(
                      channel.followers ||
                      0
                    )
                  }
                  followers
                </small>

              </article>
            `
          ).join("")
        }

      </div>

    </section>
  `
  );
}

window.createChannel =
  async function () {
    if (!state.token) {
      alert("Please login first.");
      return;
    }

    const name =
      prompt(
        "Enter your channel name:"
      );

    if (!name?.trim()) return;

    const description =
      prompt(
        "Enter your channel description:"
      ) || "";

    try {
      const data = await api(
        "/api/channels",
        {
          method: "POST",

          body: JSON.stringify({
            name: name.trim(),
            description
          })
        }
      );

      const channel =
        data.channel ||
        data.data;

      if (channel) {
        state.channels.unshift(
          channel
        );
      } else {
        await loadChannels();
      }

      channelsPage();

    } catch (error) {
      showError(error);
    }
  };

/* =========================================================
   AI
========================================================= */

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

        ${tools.map(
          tool => `
            <button
              class="ai-tool"
              onclick="useAI('${escapeHtml(
                tool
              )}')">

              <strong>
                ${escapeHtml(tool)}
              </strong>

              <small>
                Use AI
              </small>

            </button>
          `
        ).join("")}

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

      <div id="aiResult"></div>

    </section>
  `
  );
}

window.useAI = function (
  tool
) {
  const promptBox =
    document.getElementById(
      "aiPrompt"
    );

  if (promptBox) {
    promptBox.value =
      `${tool}: `;
    promptBox.focus();
  }
};

window.generateAI =
  async function () {
    if (!state.token) {
      alert("Please login first.");
      return;
    }

    const input =
      document.getElementById(
        "aiPrompt"
      );

    const result =
      document.getElementById(
        "aiResult"
      );

    const prompt =
      input?.value.trim();

    if (!prompt) {
      alert(
        "Enter a prompt first."
      );
      return;
    }

    if (state.aiCredits < 1) {
      alert(
        "You have no AI credits remaining."
      );
      return;
    }

    result.innerHTML = `
      <div class="notice">
        Generating...
      </div>
    `;

    try {
      const data = await api(
        "/api/ai/generate",
        {
          method: "POST",

          body: JSON.stringify({
            prompt
          })
        }
      );

      if (
        typeof data.aiCredits ===
        "number"
      ) {
        state.aiCredits =
          data.aiCredits;
      } else {
        state.aiCredits -= 1;
      }

      result.innerHTML = `
        <div class="notice">

          <strong>
            Veylora AI
          </strong>

          <p>
            ${escapeHtml(
              data.text ||
              data.output ||
              data.result ||
              "Generation completed."
            )}
          </p>

          ${
            data.imageUrl
              ? `
                <img
                  src="${escapeHtml(
                    data.imageUrl
                  )}"
                  alt="AI result"
                  style="max-width:100%;">
              `
              : ""
          }

          ${
            data.videoUrl
              ? `
                <video
                  controls
                  style="max-width:100%;">

                  <source
                    src="${escapeHtml(
                      data.videoUrl
                    )}">

                </video>
              `
              : ""
          }

        </div>
      `;

      saveState();

    } catch (error) {
      result.innerHTML = "";

      showError(error);
    }
  };

/* =========================================================
   PREMIUM / PAYMENTS
========================================================= */

function premiumPage() {
  const plans = [
    {
      name: "Go",
      price: "₦10,000"
    },
    {
      name: "Pro",
      price: "₦30,000"
    },
    {
      name: "Ultra",
      price: "₦50,000"
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
        Choose a Veylora premium plan.
      </p>

      <div class="plans">

        ${plans.map(
          plan => `
            <article
              class="plan-card">

              <h3>
                ${plan.name}
              </h3>

              <div class="price">
                ${plan.price}
                <small>/month</small>
              </div>

              <ul>

                <li>
                  ✓ More AI credits
                </li>

                <li>
                  ✓ Premium features
                </li>

                <li>
                  ✓ Priority processing
                </li>

              </ul>

              <button
                class="primary full"
                onclick="startCheckout('${escapeHtml(
                  plan.name
                )}')">

                Choose ${escapeHtml(
                  plan.name
                )}

              </button>

            </article>
          `
        ).join("")}

      </div>

    </section>
  `
  );
}

window.startCheckout =
  async function (plan) {
    if (!state.token) {
      alert(
        "Please login before purchasing."
      );
      return;
    }

    try {
      const data = await api(
        "/api/payments/checkout",
        {
          method: "POST",

          body: JSON.stringify({
            plan
          })
        }
      );

      /*
       * Your backend should return:
       *
       * {
       *   checkoutUrl: "https://..."
       * }
       */

      if (!data.checkoutUrl) {
        throw new Error(
          "Payment checkout URL was not returned."
        );
      }

      window.location.href =
        data.checkoutUrl;

    } catch (error) {
      showError(error);
    }
  };

/* =========================================================
   ADMIN
========================================================= */

async function adminPage() {
  shell(
    "admin",
    `

    <section class="panel">

      <h2>
        Admin Dashboard
      </h2>

      <div id="adminContent">

        Loading...

      </div>

    </section>
  `
  );

  if (!state.token) {
    document.getElementById(
      "adminContent"
    ).innerHTML = `
      <div class="notice">
        Login required.
      </div>
    `;

    return;
  }

  try {
    const data = await api(
      "/api/admin/stats"
    );

    const stats =
      data.stats ||
      data;

    document.getElementById(
      "adminContent"
    ).innerHTML = `

      <div class="stats">

        <article>
          <small>
            Users
          </small>

          <strong>
            ${Number(
              stats.users || 0
            )}
          </strong>
        </article>

        <article>
          <small>
            Active
          </small>

          <strong>
            ${Number(
              stats.activeUsers || 0
            )}
          </strong>
        </article>

        <article>
          <small>
            AI Credits
          </small>

          <strong>
            ${Number(
              stats.aiCredits || 0
            )}
          </strong>
        </article>

        <article>
          <small>
            Messages
          </small>

          <strong>
            ${Number(
              stats.messages || 0
            )}
          </strong>
        </article>

      </div>
    `;

  } catch (error) {
    document.getElementById(
      "adminContent"
    ).innerHTML = `
      <div class="notice">
        ${escapeHtml(
          error.message ||
          "Unable to load admin dashboard."
        )}
      </div>
    `;
  }
}

/* =========================================================
   NAVIGATION
========================================================= */

window.showPage =
  async function (page) {
    const pages = {
      home: homePage,
      chat: chatPage,
      calls: callsPage,
      stories: storiesPage,
      channels: channelsPage,
      ai: aiPage,
      premium: premiumPage,
      admin: adminPage
    };

    if (!pages[page]) return;

    if (page === "chat") {
      await loadMessages();
    }

    if (page === "stories") {
      await loadStories();
    }

    if (page === "channels") {
      await loadChannels();
    }

    pages[page]();
  };

/* =========================================================
   START APPLICATION
========================================================= */

async function startApplication() {
  const authenticated =
    await loadCurrentUser();

  if (authenticated) {
    await loadAppData();
  }

  showPage("home");
}

startApplication();