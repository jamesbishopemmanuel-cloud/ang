import "./style.css";

const state = {
  user: {
    name: "Veylora User",
    phone: "+234 800 000 0000"
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

  messages: [
    {
      from: "Veylora",
      text: "Welcome to Veylora 👋",
      time: "Now"
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

function saveState() {
  localStorage.setItem(
    "veylora_state",
    JSON.stringify(state)
  );
}

function loadState() {
  try {
    const saved = localStorage.getItem("veylora_state");

    if (saved) {
      Object.assign(
        state,
        JSON.parse(saved)
      );
    }
  } catch {
    console.log("Local state could not be loaded.");
  }
}

function shell(active, content) {
  document.getElementById("app").innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="logo">V</div>

        <div>
          <strong>Veylora</strong>
          <small>Connect • Create • Share</small>
        </div>
      </div>

      <div class="user-pill">
        ${escapeHtml(state.user.name)}
      </div>
    </header>

    <nav class="navigation">
      ${navigation.map(([id, label]) => `
        <button
          class="${active === id ? "active" : ""}"
          onclick="showPage('${id}')">
          ${label}
        </button>
      `).join("")}
    </nav>

    <main>
      ${content}
    </main>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function homePage() {
  shell("home", `
    <section class="hero">
      <div>
        <span class="eyebrow">VEY LORA</span>

        <h1>
          Connect.<br>
          Create.<br>
          Share.
        </h1>

        <p>
          Messaging, free voice and video calls,
          Stories, Status, Channels and AI.
        </p>

        <div class="actions">
          <button class="primary"
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
        <strong>${state.aiCredits}</strong>
        <span>available</span>
      </div>
    </section>

    <section>
      <h2>Veylora features</h2>

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
        ].map(([icon, title]) => `
          <article class="card">
            <div class="feature-icon">${icon}</div>
            <h3>${title}</h3>
            <p>Open ${title}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `);
}

function chatPage() {
  shell("chat", `
    <section class="panel">
      <h2>Messages</h2>

      <div class="messages">
        ${state.messages.map(message => `
          <div class="message">
            <strong>${escapeHtml(message.from)}</strong>
            <p>${escapeHtml(message.text)}</p>
            <small>${escapeHtml(message.time)}</small>
          </div>
        `).join("")}
      </div>

      <form onsubmit="sendMessage(event)">
        <input
          id="messageInput"
          autocomplete="off"
          placeholder="Write a message..."
          required>

        <button class="primary">
          Send
        </button>
      </form>
    </section>
  `);
}

window.sendMessage = function(event) {
  event.preventDefault();

  const input =
    document.getElementById("messageInput");

  const text = input.value.trim();

  if (!text) return;

  state.messages.push({
    from: "You",
    text,
    time: "Just now"
  });

  saveState();

  chatPage();

  setTimeout(() => {
    state.messages.push({
      from: "Veylora AI",
      text: "Message received. Connect a production messaging backend for real-time delivery.",
      time: "Now"
    });

    saveState();

    if (document.getElementById("messageInput")) {
      chatPage();
    }
  }, 500);
};

function callsPage() {
  shell("calls", `
    <section class="panel">
      <h2>Calls</h2>

      <p>
        Voice and video calling interface.
      </p>

      <div class="call-grid">
        <button
          class="call-card"
          onclick="startCall('voice')">
          <span>📞</span>
          <strong>Voice Call</strong>
          <small>FREE</small>
        </button>

        <button
          class="call-card"
          onclick="startCall('video')">
          <span>🎥</span>
          <strong>Video Call</strong>
          <small>FREE</small>
        </button>
      </div>

      <div class="notice">
        The interface is ready. Real-time
        calling requires a production WebRTC/
        calling backend.
      </div>
    </section>
  `);
}

window.startCall = function(type) {
  const label =
    type === "video"
      ? "Video call"
      : "Voice call";

  alert(
    `${label} interface opened.\n\n` +
    "Connect your production WebRTC service " +
    "to establish real calls."
  );
};

function storiesPage() {
  shell("stories", `
    <section class="panel">
      <h2>Stories & Status</h2>

      <p>
        Create a story or status update.
      </p>

      <form onsubmit="createStory(event)">
        <textarea
          id="storyText"
          placeholder="What's happening?"
          required></textarea>

        <button class="primary">
          📸 Post Story — FREE
        </button>
      </form>

      <div class="stories-list">
        ${state.stories.map(story => `
          <article class="story-card">
            <strong>
              ${escapeHtml(story.name)}
            </strong>

            <p>
              ${escapeHtml(story.text)}
            </p>

            <small>
              ${escapeHtml(story.time)}
            </small>
          </article>
        `).join("")}
      </div>
    </section>
  `);
}

window.createStory = function(event) {
  event.preventDefault();

  const input =
    document.getElementById("storyText");

  const text = input.value.trim();

  if (!text) return;

  state.stories.unshift({
    name: state.user.name,
    text,
    time: "Just now"
  });

  saveState();

  storiesPage();
};

function channelsPage() {
  shell("channels", `
    <section class="panel">
      <h2>Channels</h2>

      <button
        class="primary"
        onclick="createChannel()">
        ＋ Create Channel — FREE
      </button>

      <div class="channel-list">
        ${state.channels.map(channel => `
          <article class="channel-card">
            <h3>
              ${escapeHtml(channel.name)}
            </h3>

            <p>
              ${escapeHtml(channel.description)}
            </p>

            <small>
              ${channel.followers} followers
            </small>
          </article>
        `).join("")}
      </div>
    </section>
  `);
}

window.createChannel = function() {
  const name =
    prompt("Enter your channel name:");

  if (!name || !name.trim()) return;

  state.channels.unshift({
    name: name.trim(),
    description: "New Veylora channel",
    followers: 0
  });

  saveState();

  channelsPage();
};

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

  shell("ai", `
    <section class="panel">
      <h2>Veylora AI</h2>

      <div class="ai-balance">
        <strong>${state.aiCredits}</strong>
        <span>AI credits</span>
      </div>

      <div class="ai-grid">
        ${tools.map(tool => `
          <button
            class="ai-tool"
            onclick="useAI('${escapeHtml(tool)}')">
            <strong>${escapeHtml(tool)}</strong>
            <small>Use AI</small>
          </button>
        `).join("")}
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
  `);
}

window.useAI = function(tool) {
  alert(
    `${tool}\n\n` +
    "The UI is ready. Connect your secure " +
    "server-side AI provider to generate real content."
  );
};

window.generateAI = function() {
  const input =
    document.getElementById("aiPrompt");

  const result =
    document.getElementById("aiResult");

  const prompt = input.value.trim();

  if (!prompt) {
    alert("Enter a prompt first.");
    return;
  }

  if (state.aiCredits < 1) {
    alert("You have no AI credits remaining.");
    return;
  }

  state.aiCredits -= 1;

  saveState();

  result.innerHTML = `
    <div class="notice">
      <strong>AI request created</strong>
      <p>
        ${escapeHtml(prompt)}
      </p>
        Connect the production AI backend
        to return the generated result.
    </div>
  `;

  aiPage();
};

function premiumPage() {
  const plans = [
    {
      name: "Go",
      price: "₦10,000",
      features: [
        "More AI credits",
        "Faster processing"
      ]
    },
    {
      name: "Pro",
      price: "₦30,000",
      trial: "2 months eligible trial",
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
      trial: "7-day eligible trial",
      features: [
        "Everything in Pro",
        "Highest AI priority",
        "Highest AI allowance",
        "Ultra AI tools"
      ]
    }
  ];

  shell("premium", `
    <section class="panel">
      <h2>Premium</h2>

      <p>
        Premium plans unlock advanced AI and
        additional services.
      </p>

      <div class="plans">
        ${plans.map(plan => `
          <article class="plan-card">
            <h3>${plan.name}</h3>

            <div class="price">
              ${plan.price}
              <small>/month</small>
            </div>

            ${
              plan.trial
                ? `<div class="trial">
                    ${plan.trial}
                   </div>`
                : ""
            }

            <ul>
              ${plan.features.map(feature => `
                <li>✓ ${feature}</li>
              `).join("")}
            </ul>

            <button
              class="primary full"
              onclick="startCheckout('${plan.name}')">
              Choose ${plan.name}
            </button>
          </article>
        `).join("")}
      </div>

      <div class="notice">
        Production payment entitlement must be
        verified server-side. Never put private
        payment credentials in this APK.
      </div>
    </section>
  `);
}

window.startCheckout = function(plan) {
  alert(
    `${plan} selected.\n\n` +
    "Connect your secure payment provider " +
    "backend to create the checkout session."
  );
};

function adminPage() {
  shell("admin", `
    <section class="panel">
      <h2>Admin Dashboard</h2>

      <div class="stats">
        <article>
          <small>Users</small>
          <strong>128,540</strong>
        </article>

        <article>
          <small>Active</small>
          <strong>45,320</strong>
        </article>

        <article>
          <small>AI Credits</small>
          <strong>18.2M</strong>
        </article>

        <article>
          <small>Stories</small>
          <strong>${state.stories.length}</strong>
        </article>
      </div>

      <div class="notice">
        Admin authorization must be enforced
        on the server. Do not rely on this
        frontend screen for security.
      </div>
    </section>
  `);
}

window.showPage = function(page) {
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

  if (pages[page]) {
    pages[page]();
  }
};

loadState();
showPage("home");