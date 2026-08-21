import "./style.css";

const features = [
  ["📞", "Voice Calls"],
  ["🎥", "Video Calls"],
  ["📸", "Stories"],
  ["🟢", "Status"],
  ["📢", "Channels"],
  ["💬", "Messaging"],
  ["👥", "Communities"]
];

const plans = [
  {
    name: "Go",
    price: "₦10,000",
    trial: "",
    features: [
      "More AI credits",
      "Faster AI processing"
    ]
  },
  {
    name: "Pro",
    price: "₦30,000",
    trial: "2-month eligible trial",
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

const navigation = [
  ["home", "Home"],
  ["calls", "Calls"],
  ["stories", "Stories"],
  ["channels", "Channels"],
  ["ai", "AI"],
  ["premium", "Premium"],
  ["admin", "Admin"]
];

const app = document.getElementById("app");

function renderShell(active, content) {
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="logo">V</div>

        <div>
          <strong>Veylora</strong>
          <small>AI • Chat • Create</small>
        </div>
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

function homePage() {
  renderShell("home", `
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow">VEY LORA</span>

        <h1>
          Connect.<br>
          Create.<br>
          Share.
        </h1>

        <p>
          Messaging, free voice and video calls,
          Stories, Status, Channels and powerful AI.
        </p>

        <div class="actions">
          <button class="primary" onclick="showPage('calls')">
            Open Calls
          </button>

          <button onclick="showPage('premium')">
            View Premium
          </button>
        </div>
      </div>

      <div class="credit-card">
        <small>AI CREDITS</small>
        <strong>1,240</strong>
        <span>available</span>
      </div>
    </section>

    <section>
      <h2>Free for everyone</h2>

      <div class="feature-grid">
        ${features.map(([icon, name]) => `
          <article class="card">
            <div class="feature-icon">${icon}</div>

            <h3>${name}</h3>

            <span class="free">
              FREE
            </span>

            <p>
              No Premium subscription required.
            </p>
          </article>
        `).join("")}
      </div>
    </section>
  `);
}

function callsPage() {
  renderShell("calls", `
    <section class="panel">
      <h2>Voice & Video Calls</h2>

      <p>
        Voice and video calls are free.
      </p>

      <div class="call-grid">
        <button class="call-card" onclick="demo('Voice call')">
          <span>📞</span>
          <strong>Voice Call</strong>
          <small>FREE</small>
        </button>

        <button class="call-card" onclick="demo('Video call')">
          <span>🎥</span>
          <strong>Video Call</strong>
          <small>FREE</small>
        </button>
      </div>

      <div class="notice">
        Real-time calls require the production calling
        backend/service to be connected.
      </div>
    </section>
  `);
}

function storiesPage() {
  renderShell("stories", `
    <section class="panel">
      <h2>Stories & Status</h2>

      <p>
        Share photos, videos and updates for free.
      </p>

      <div class="actions">
        <button class="primary"
          onclick="demo('Create Story')">
          ＋ Post Story — FREE
        </button>

        <button
          onclick="demo('Create Status')">
          ＋ Post Status — FREE
        </button>
      </div>

      <div class="story-card">
        <strong>Your Story</strong>
        <small>FREE</small>
      </div>
    </section>
  `);
}

function channelsPage() {
  renderShell("channels", `
    <section class="panel">
      <h2>Channels</h2>

      <p>
        Create, follow and publish to Channels for free.
      </p>

      <button
        class="primary"
        onclick="demo('Create Channel')">
        ＋ Create Channel — FREE
      </button>

      <div class="channel-card">
        <strong>Veylora Creators</strong>
        <small>
          Latest creator updates
        </small>
      </div>
    </section>
  `);
}

function aiPage() {
  const tools = [
    "AI Chat",
    "Text → Image",
    "Text → Video",
    "Image → Video",
    "Video → Video",
    "AI Voice",
    "AI Photo Edit",
    "AI Video Edit"
  ];

  renderShell("ai", `
    <section class="panel">
      <h2>AI Creation Center</h2>

      <p>
        Powerful AI tools connected through the secure
        backend in production.
      </p>

      <div class="ai-grid">
        ${tools.map(tool => `
          <button
            class="ai-tool"
            onclick="demo('${tool}')">

            <strong>${tool}</strong>

            <small>
              Open tool
            </small>
          </button>
        `).join("")}
      </div>

      <textarea
        placeholder="Describe what you want Veylora AI to create...">
      </textarea>

      <button
        class="primary"
        onclick="demo('AI generation')">
        ✨ Generate
      </button>
    </section>
  `);
}

function premiumPage() {
  renderShell("premium", `
    <section class="panel">
      <h2>Premium</h2>

      <p>
        Basic communication remains free.
        Premium provides advanced AI and premium tools.
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
                ? `<div class="trial">${plan.trial}</div>`
                : ""
            }

            <ul>
              ${plan.features.map(feature => `
                <li>✓ ${feature}</li>
              `).join("")}
            </ul>

            <button
              class="primary full"
              onclick="demo('${plan.name} checkout')">
              Get ${plan.name}
            </button>

          </article>
        `).join("")}
      </div>
    </section>
  `);
}

function adminPage() {
  renderShell("admin", `
    <section class="panel">
      <h2>Admin Dashboard</h2>

      <div class="stats">
        <article>
          <small>Users</small>
          <strong>128,540</strong>
        </article>

        <article>
          <small>Active Users</small>
          <strong>45,320</strong>
        </article>

        <article>
          <small>Revenue</small>
          <strong>₦12.5M</strong>
        </article>

        <article>
          <small>AI Credits</small>
          <strong>18.2M</strong>
        </article>
      </div>

      <div class="notice">
        Production admin actions must be protected by
        backend RBAC and audit logging.
      </div>
    </section>
  `);
}

window.demo = function (name) {
  alert(
    name +
    " demo — production service is not connected yet."
  );
};

window.showPage = function (page) {
  const pages = {
    home: homePage,
    calls: callsPage,
    stories: storiesPage,
    channels: channelsPage,
    ai: aiPage,
    premium: premiumPage,
    admin: adminPage
  };

  if (pages[page]) {
    pages[page]();
  } else {
    homePage();
  }
};

showPage("home");