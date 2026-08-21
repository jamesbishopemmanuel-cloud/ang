import './style.css';

const free=[['📞','Voice Calls'],['🎥','Video Calls'],['📸','Stories'],['🟢','Status'],['📢','Channels'],['💬','Messaging'],['👥','Communities']];
const plans=[['Go','₦10,000',''],['Pro','₦30,000','2-month eligible trial'],['Ultra','₦50,000','7-day eligible trial']];
const app=document.querySelector('#app');

const navItems=[['home','Home'],['calls','Calls'],['stories','Stories'],['channels','Channels'],['ai','AI'],['premium','Premium'],['admin','Admin']];

function shell(active,body){
 app.innerHTML=`<header><div class="brand"><span class="logo">V</span><span><strong>Veylora</strong><small>AI • Chat • Create</small></span></div></header>
 <nav>${navItems.map(([id,label])=>`<button class="${id===active?'active':''}" onclick="showPage('${id}')">${label}</button>`).join('')}</nav>
 <main>${body}</main>`;
}
function home(){shell('home',`<section class="hero"><div><label>VEY LORA</label><h1>Connect. Create. Share.</h1><p>Messaging, free voice/video calls, Stories, Status, Channels and powerful AI.</p><button class="primary" onclick="showPage('calls')">Open Calls</button> <button onclick="showPage('premium')">Premium</button></div><aside class="credit"><small>AI Credits</small><b>1,240</b><small>available</small></aside></section><h2>Free for everyone</h2><div class="grid">${free.map(([i,n])=>`<article><span class="icon">${i}</span><h3>${n}</h3><b class="free">FREE</b><p>No Premium subscription required.</p></article>`).join('')}</div>`)}
function calls(){shell('calls',`<section class="panel"><h2>Voice & Video Calls</h2><p>Basic voice and video calling are free.</p><div class="callgrid"><button class="call" onclick="demo('Voice call')">📞<b>Voice Call</b><small>FREE</small></button><button class="call" onclick="demo('Video call')">🎥<b>Video Call</b><small>FREE</small></button></div><div class="notice">Real-time calling requires a production calling service/backend.</div></section>`)}
function stories(){shell('stories',`<section class="panel"><h2>Stories & Status</h2><p>Post Stories and Status updates for free.</p><button class="primary" onclick="demo('Create Story')">＋ Post Story — FREE</button> <button onclick="demo('Create Status')">＋ Post Status — FREE</button><div class="story">Your Story <small>FREE</small></div></section>`)}
function channels(){shell('channels',`<section class="panel"><h2>Channels</h2><p>Create, follow and post to Channels for free.</p><button class="primary" onclick="demo('Create Channel')">＋ Create Channel — FREE</button><div class="channel"><b>Veylora Creators</b><small>Latest creator updates</small></div></section>`)}
function ai(){shell('ai',`<section class="panel"><h2>AI Creation Center</h2><p>Advanced AI tools use the secure backend in production.</p><div class="tools">${['AI Chat','Text → Image','Text → Video','Image → Video','Video → Video','AI Voice','AI Photo Edit','AI Video Edit'].map(x=>`<button onclick="demo('${x}')"><b>${x}</b><small>Open tool</small></button>`).join('')}</div><textarea placeholder="Describe what you want Veylora AI to create..."></textarea><button class="primary" onclick="demo('AI generation')">✨ Generate</button></section>`)}
function premium(){shell('premium',`<section class="panel"><h2>Premium</h2><p>Basic communication remains free. Premium focuses on advanced AI and premium tools.</p><div class="plans">${plans.map(x=>`<article><h3>${x[0]}</h3><strong class="price">${x[1]}</strong><small>/month</small>${x[2]?`<em>${x[2]}</em>`:''}<ul><li>✓ Advanced features</li><li>✓ More AI capacity</li><li>✓ Priority processing</li></ul><button class="primary" onclick="demo('${x[0]} checkout')">Get ${x[0]}</button></article>`).join('')}</div></section>`)}
function admin(){shell('admin',`<section class="panel"><h2>Admin Dashboard</h2><div class="stats"><article><small>Users</small><b>128,540</b></article><article><small>Active</small><b>45,320</b></article><article><small>Revenue</small><b>₦12.5M</b></article><article><small>AI Credits</small><b>18.2M</b></article></div><p>Production admin actions must use backend RBAC and audit logs.</p></section>`)}
window.demo=x=>alert(x+' demo — production service not connected yet.');
window.showPage=p=>({home,calls,stories,channels,ai,premium,admin}[p]||home)();
showPage('home');
