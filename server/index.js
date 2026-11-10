import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_ORIGIN || '*' } });
const port = process.env.PORT || 4000;
app.use(express.json());

const counters = new Map();
const ticketSchema = new mongoose.Schema({serviceId:{type:String,required:true},token:{type:String,required:true},name:{type:String,required:true},socketId:String,active:{type:Boolean,default:true},createdAt:{type:Date,default:Date.now}});
const QueueTicket = mongoose.model('QueueTicket', ticketSchema);
const services = [
  {id:'canteen',name:'Campus Canteen',kind:'Food & drink',icon:'🍜',color:'orange',wait:8,queue:7,open:true,location:'Student Center · Ground floor'},
  {id:'coffee',name:'Bean There Coffee',kind:'Coffee shop',icon:'☕',color:'green',wait:4,queue:3,open:true,location:'Library · Main entrance'},
  {id:'registrar',name:'Registrar Office',kind:'Student services',icon:'📄',color:'blue',wait:15,queue:12,open:true,location:'Admin Building · Room 104'},
  {id:'print',name:'Print & Copy Desk',kind:'Campus services',icon:'🖨️',color:'purple',wait:6,queue:5,open:true,location:'Learning Commons · Level 1'}
].map(item => ({...item, tickets: []}));

function snapshot(service) {
  return {id:service.id,name:service.name,kind:service.kind,icon:service.icon,color:service.color,wait:service.wait,queue:service.tickets.length + service.queue,open:service.open,location:service.location};
}
function sendUpdates() {
  const state = services.map(snapshot);
  io.emit('queues:update', state);
  io.sockets.sockets.forEach(socket => {
    const ticket = services.flatMap(service => service.tickets.map((item,index) => ({...item,serviceId:service.id,position:service.queue+index+1,wait:(service.queue+index+1)*2}))).find(item => item.socketId === socket.id);
    if (ticket) socket.emit('ticket:update', ticket);
  });
}
app.get('/api/services', (_req,res) => res.json(services.map(snapshot)));
app.post('/api/tickets', async (req,res) => {
  const service = services.find(item => item.id === req.body.serviceId);
  const name = String(req.body.name || '').trim().slice(0,40);
  if (!service || !name) return res.status(400).json({error:'Choose a service and enter your name.'});
  const ticket = {id:randomUUID(),token:`Q${String((counters.get(service.id)||0)+1).padStart(3,'0')}`,name,socketId:req.body.socketId || null,createdAt:Date.now()};
  counters.set(service.id,(counters.get(service.id)||0)+1);
  if(mongoose.connection.readyState===1){const saved=await QueueTicket.create({...ticket,serviceId:service.id});ticket.id=String(saved._id);}
  service.tickets.push(ticket); sendUpdates();
  const position=service.queue+service.tickets.length;
  res.status(201).json({...ticket,serviceId:service.id,position,wait:position*2});
});
app.delete('/api/tickets/:id', async (req,res) => {
  for (const service of services) service.tickets = service.tickets.filter(ticket => ticket.id !== req.params.id);
  if(mongoose.connection.readyState===1)await QueueTicket.findByIdAndUpdate(req.params.id,{active:false});
  sendUpdates(); res.status(204).end();
});
io.on('connection', socket => { socket.emit('queues:update',services.map(snapshot)); socket.on('queues:subscribe',()=>sendUpdates()); });
// Demo stand-in for a staff counter: advances every queue so the live position visibly changes.
setInterval(async () => {
  for (const service of services) {
    if(service.queue>0)service.queue--;
    else if(service.tickets.length){const served=service.tickets.shift();if(mongoose.connection.readyState===1)await QueueTicket.findByIdAndUpdate(served.id,{active:false});}
  }
  sendUpdates();
}, 30000).unref();

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
app.use(express.static(path.join(root,'dist')));
app.get('*',(req,res,next)=>req.path.startsWith('/api/')?next():res.sendFile(path.join(root,'dist','index.html')));
if(process.env.MONGO_URI)mongoose.connect(process.env.MONGO_URI).then(async()=>{
  for(const service of services){const saved=await QueueTicket.find({serviceId:service.id,active:true}).sort({createdAt:1}).lean();service.tickets=saved.map(item=>({...item,id:String(item._id)}));}
  sendUpdates();console.log('MongoDB connected');
}).catch(error=>console.error('MongoDB connection failed:',error.message));
app.get('/api/health',(_req,res)=>res.json({ok:true,database:mongoose.connection.readyState===1?'connected':'demo-memory'}));
httpServer.listen(port,()=>console.log(`QueueLess server listening on ${port}`));
