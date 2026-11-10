import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io({ autoConnect: false });
const categories = ['All queues','Food & drink','Coffee shop','Student services','Campus services'];

export default function App() {
  const [services,setServices] = useState([]), [ticket,setTicket] = useState(null);
  const [category,setCategory] = useState('All queues'), [modal,setModal] = useState(null), [name,setName] = useState('');
  const [notice,setNotice] = useState(''), [connected,setConnected] = useState(false);
  useEffect(() => {
    fetch('/api/services').then(r=>r.json()).then(setServices).catch(()=>setNotice('Start the QueueLess server to see live queues.'));
    socket.connect(); socket.on('connect',()=>setConnected(true)); socket.on('disconnect',()=>setConnected(false));
    socket.on('queues:update',setServices); socket.on('ticket:update',setTicket);
    return ()=>{socket.off('queues:update');socket.off('ticket:update');socket.disconnect();};
  },[]);
  useEffect(()=>{if(ticket?.position===1&&ticket.notified!==true){setNotice('You’re up next! Head to the counter.');if('Notification'in window&&Notification.permission==='granted')new Notification('QueueLess',{body:'Your turn is coming up.'});}},[ticket?.position]);
  const shown=useMemo(()=>category==='All queues'?services:services.filter(s=>s.kind===category),[services,category]);
  async function join(service){
    if(!name.trim()){setModal(service);return;}
    if('Notification'in window&&Notification.permission==='default')Notification.requestPermission();
    const response=await fetch('/api/tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({serviceId:service.id,name:name.trim(),socketId:socket.id})});
    const data=await response.json();if(!response.ok){setNotice(data.error);return;}setTicket(data);setModal(null);setNotice(`Token ${data.token} is yours. You’re in the queue.`);
  }
  async function leave(){if(ticket){await fetch(`/api/tickets/${ticket.id}`,{method:'DELETE'});setTicket(null);setNotice('Your queue ticket was cancelled.');}}
  return <><header className="topbar"><a className="brand" href="#"><span>Q</span>queueless</a><div className="campus"><i/> Northbridge University <b>⌄</b></div><div className="head-right"><span className="live"><i className={connected?'on':''}/>{connected?'LIVE UPDATES':'CONNECTING'}</span><button className="profile" aria-label="Profile">A</button></div></header>
    <main><section className="welcome"><div><div className="eyebrow">YOUR CAMPUS, WITHOUT THE WAIT</div><h1>More time for<br/><em>what matters.</em></h1><p>Grab a digital token, skip the line, and get back to your day.</p><a className="dark-button" href="#queues">Find a queue <span>↓</span></a></div><div className="welcome-art"><div className="art-circle"/><div className="token-card"><div className="token-head"><span>NOW SERVING</span><b>● LIVE</b></div><strong>Q-<span>04</span></strong><div className="token-foot"><span>Bean There Coffee</span><small>2 people ahead of you</small></div></div><div className="wait-chip">⌛ <span><b>~4 min</b><small>estimated wait</small></span></div><div className="leaf">✳</div></div></section>
    <section className="stats"><div><span className="stat-icon violet">⌁</span><span><b>4</b><small>Campus spots</small></span></div><div><span className="stat-icon peach">◷</span><span><b>{services.reduce((a,s)=>a+(s.queue||0),0)}</b><small>Students in line</small></span></div><div><span className="stat-icon mint">↗</span><span><b>~8 min</b><small>Average wait today</small></span></div><span className="stat-note">One less line. One better day. <b>✦</b></span></section>
    <section className="queue-section" id="queues"><div className="section-top"><div><div className="eyebrow">PICK YOUR NEXT STOP</div><h2>Campus queues<span>.</span></h2><p>Real-time wait estimates, straight from campus.</p></div><span className="updated"><i className={connected?'on':''}/> Updates live</span></div><div className="filters">{categories.map(item=><button className={category===item?'active':''} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div><div className="service-grid">{shown.map(service=><article className="service-card" key={service.id}><div className={`service-visual ${service.color}`}><span className="service-emoji">{service.icon}</span><span className="open-badge"><i/> Open now</span><button className="heart" aria-label="Save queue">♡</button></div><div className="service-info"><div className="service-kind">{service.kind}</div><h3>{service.name}</h3><div className="service-place">⌖ {service.location}</div><div className="wait-panel"><div><small>EST. WAIT</small><strong>~{service.wait} <i>min</i></strong></div><span className="wait-divider"/><div><small>IN LINE</small><strong>{service.queue} <i>people</i></strong></div><span className="trend">↘</span></div><button className="join" onClick={()=>join(service)}>Get a token <span>→</span></button></div></article>)}</div></section>
    <section className="bottom-tip"><span className="tip-icon">✦</span><div><b>A little heads-up goes a long way.</b><p>We’ll let you know when your turn is getting close. Keep notifications on.</p></div><button onClick={()=>('Notification'in window?Notification.requestPermission():setNotice('Notifications are not supported in this browser.'))}>Enable alerts <span>→</span></button></section>
    </main><footer><a className="brand" href="#"><span>Q</span>queueless</a><span>Less waiting. More living.</span><span>© 2025 QueueLess · Northbridge University</span></footer>
    {modal&&<div className="overlay" onClick={()=>setModal(null)}><form className="dialog" onSubmit={e=>{e.preventDefault();join(modal);}} onClick={e=>e.stopPropagation()}><button className="close" type="button" onClick={()=>setModal(null)}>×</button><div className="eyebrow">JOIN A LIVE QUEUE</div><h2>Your name, please.</h2><p>We’ll use this to display your token at <b>{modal.name}</b>.</p><label>Name<input autoFocus value={name} onChange={e=>setName(e.target.value)} required maxLength={40} placeholder="e.g. Alex Morgan"/></label><button className="join" type="submit">Get my token <span>→</span></button></form></div>}
    {ticket&&<div className="ticket-toast"><span className="ticket-token">{ticket.token}</span><span><b>You're in line at {services.find(s=>s.id===ticket.serviceId)?.name}</b><small>Position {ticket.position} · about {ticket.wait} min</small></span><button onClick={leave}>Leave queue</button></div>}{notice&&<button className="notice" onClick={()=>setNotice('')}>{notice} <b>×</b></button>}</>;
}
