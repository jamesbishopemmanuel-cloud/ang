import "./style.css";
import { io } from "socket.io-client";

/*
|--------------------------------------------------------------------------
| Veylora frontend
|--------------------------------------------------------------------------
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://10.0.2.2:8080";

let socket = null;

const state = {
  user: null,
  token: localStorage.getItem("veylora_token") || "",
  otpPhone: "",
  aiCredits: Number(
    localStorage.getItem("veylora_ai_credits") || 1240
  ),

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
| Utilities
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
    const credits = localStorage.getItem(
      "veylora_ai_credits"
    );

    if (credits) {
      state.aiCredits = Number(credits) || 1240;
    }

    const stories = localStorage.getItem(
      "veylora_stories"
    );

    if (stories) {
      state.stories = JSON.parse(stories);
    }

    const channels = localStorage.getItem(
      "veylora_channels"
    );

    if (channels) {
      state.channels = JSON.parse(channels);
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

  button.disabled = loading;

  if (loading) {
    button.dataset.originalText =
      button.textContent;

    button.textContent = "Please wait...";
  } else {
    button.text