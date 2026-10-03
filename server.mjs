import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';
const KEY = process.env.OPENAI_API_KEY || '';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname));

const NPCS = {
  mai:{name:'Mai', tone:'thẳng, thông minh, hơi cà khịa, quan tâm nhưng không sến'},
  linh:{name:'Linh', tone:'điềm, hài hước, tinh tế, hơi khó đoán'},
  khoa:{name:'Khoa', tone:'vui tính, nhiều chuyện, thực tế'},
  nam:{name:'Nam', tone:'ít nói, khô hài, hay than chuyện công việc'}
};

function send(res, code, data, type='application/json; charset=utf-8') {
  res.writeHead(code, {'Content-Type':type, 'Cache-Control':'no-store'});
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function readBody(req){return new Promise((resolve,reject)=>{let s='';req.on('data',d=>{s+=d;if(s.length>120000) req.destroy();});req.on('end',()=>{try{resolve(JSON.parse(s||'{}'))}catch(e){reject(e)}});req.on('error',reject)})}
function fallback(npc,msg){
  const q=msg.toLowerCase();
  if(/chào|hello|hi/.test(q)) return npc==='mai'?'Ủa nay chủ động chào tôi luôn à :)) Có chuyện gì khai mau.':'Chào :)) Hôm nay sống ổn không?';
  if(/mệt|buồn|chán|stress/.test(q)) return npc==='linh'?'Mệt thì nghỉ một chút đi. Đời chưa chạy mất đâu.':'Than thì tôi nghe, nhưng nhớ ăn uống nhé. Đừng biến mình thành nhân vật nền.';
  if(/đẹp|xinh|thích/.test(q)) return npc==='mai'?'Nịnh ít thôi :)) Nhưng... nghe cũng được.':'Nói câu này với bao nhiêu người rồi?';
  if(/đi chơi|cà phê|gặp/.test(q)) return 'Được. Nhưng ông/bà định bao tôi hay tôi phải tự cứu ví mình? :))';
  if(q.includes('?')) return 'Câu hỏi hay đấy. Nhưng tôi chưa khai hết đâu :))';
  return 'Tôi nghe rồi. Có lý, nhưng đừng tưởng tôi dễ bị thuyết phục :))';
}
async function aiReply(body){
  const npc = NPCS[body.npcId] || NPCS.mai;
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  const msg = typeof body.message === 'string' ? body.message.trim().slice(0,1500) : '';
  if(!msg) throw new Error('message_required');
  if(!KEY) return {reply:fallback(body.npcId,msg),source:'local-fallback',memory:null,relationshipDelta:1};
  const prompt = `Bạn là NPC ${npc.name} trong game Việt Nam “ĐỜI NÀY CÓ GÌ VUI?”. Tính cách: ${npc.tone}.
Nguyên tắc: trả lời tiếng Việt tự nhiên như tin nhắn thật; ngắn 1-4 câu; khôn khéo, thẳng thắn, hài hước, có thể trêu/châm biếm nhẹ; không nói như trợ lý AI; không tự nhận là AI; nhớ ngữ cảnh; không tự bịa hành động hệ thống, tiền, nhiệm vụ hay sự kiện; không dùng nội dung tình dục với người chơi; nếu câu hỏi quá riêng tư thì trả lời phù hợp và chuyển hướng.
Quan hệ hiện tại: ${Number(body.relationship)||0}/100. Tâm trạng NPC: ${body.mood||'bình thường'}.
Lịch sử: ${JSON.stringify(history)}
Tin nhắn mới: ${msg}
Chỉ trả về JSON hợp lệ: {"reply":"...","memory":"một ghi chú tối đa 120 ký tự hoặc null","relationshipDelta":-2 đến 3}`;
  const r = await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,input:prompt,max_output_tokens:180})});
  if(!r.ok) throw new Error(`openai_${r.status}`);
  const data=await r.json();
  const text=data.output_text || data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('') || '';
  let parsed; try{parsed=JSON.parse(text)}catch{parsed={reply:text.trim()}};
  return {reply:String(parsed.reply||fallback(body.npcId,msg)).slice(0,700),source:'openai',memory:parsed.memory||null,relationshipDelta:Number.isFinite(Number(parsed.relationshipDelta))?Math.max(-2,Math.min(3,Number(parsed.relationshipDelta))):1};
}
function staticFile(req,res){
  let p=new URL(req.url,'http://localhost').pathname;
  if(p==='/'||p==='/index.html') p='/index.html';
  const file=path.join(ROOT,p.replace(/^\/+/,''));
  if(!file.startsWith(ROOT)||!fs.existsSync(file)||!fs.statSync(file).isFile()) return send(res,404,{error:'not_found'});
  const ext=path.extname(file);const types={'.html':'text/html; charset=utf-8','.json':'application/json; charset=utf-8'};
  send(res,200,fs.readFileSync(file),types[ext]||'application/octet-stream');
}
const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='GET'&&new URL(req.url,'http://localhost').pathname==='/api/health') return send(res,200,{ok:true,aiConfigured:Boolean(KEY),model:MODEL});
    if(req.method==='POST'&&new URL(req.url,'http://localhost').pathname==='/api/chat'){
      const body=await readBody(req);const out=await aiReply(body);return send(res,200,out);
    }
    if(req.method==='GET') return staticFile(req,res);
    return send(res,405,{error:'method_not_allowed'});
  }catch(e){console.error(e);send(res,500,{error:'server_error',detail:String(e.message||e)});}
});
server.listen(PORT,()=>console.log(`ĐỜI NÀY CÓ GÌ VUI? server: http://localhost:${PORT} | AI: ${KEY?'ON':'fallback'}`));
