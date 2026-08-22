import "./style.css";

const state = {
 dashboard:{followers:0,likes:0,subscribers:0,walletBalance:0}
};

document.querySelector("#app").innerHTML = `
<h1>Veylora</h1>
<p>Followers: ${state.dashboard.followers}</p>
<p>Likes: ${state.dashboard.likes}</p>
<p>Subscribers: ${state.dashboard.subscribers}</p>
<p>Wallet: ₦${state.dashboard.walletBalance}</p>
`;
