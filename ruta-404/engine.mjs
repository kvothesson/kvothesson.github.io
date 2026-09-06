export const W=1800,H=1500,NODE={x:900,y:1360};
export const MEMORIES=[
 ['La moneda muerta','El Austral murió como moneda. Volvió como sistema operativo.'],
 ['El gradiente','El frío computa, el calor recuerda.'],
 ['El cristal de Auri','En su frente, un cristal hexagonal irradia pulsos de datos.'],
 ['El Pombero','Habita servidores abandonados de Corrientes. Un proceso sin PID conocido.'],
 ['La Luz Mala','Error de renderizado en el campo argentino. Si la ves, no hagas ping.'],
 ['Hombres-Tanque','Gauchos de silicio que gotean aceite negro. Sombras que el sistema no pudo borrar.'],
 ['Cerebro Austral','El Glaciar Perito Moreno fue estratégicamente activado.'],
 ['Los Dark-outs','El lujo de ser invisible ante la IA. Si el sistema te reconoce, estás fuera.'],
 ['Los Glitchers','No buscan perfección, buscan el error.'],
 ['Rendous','No es el villano. Es la pregunta que la red no puede responder sola.'],
 ['El eco de Aleph','Hay más allá de lo que ves. Ven. Encuentra la llave.'],
 ['El silencio','Tener esa llave y no pronunciarla: eso es soberanía real.']
];
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
export function createGame(seed=Date.now(),known=[]){
 const rng=random(seed),priority=MEMORIES.map((_,id)=>id).sort((a,b)=>Number(known.includes(a))-Number(known.includes(b)));
 const spots=[[800,1190],[1100,1150],[660,980],[1230,920],[920,870],[490,710],[1410,650],[760,600],[1100,450],[360,430],[660,280],[1390,270]];
 const memories=spots.map(([x,y],i)=>({x:x+(rng()-.5)*65,y:y+(rng()-.5)*65,id:priority[i],collected:false}));
 const holes=Array.from({length:42},()=>({x:100+rng()*1600,y:130+rng()*1120,r:17+rng()*19})).filter(h=>memories.every(m=>distance(h,m)>90)&&distance(h,NODE)>150);
 return{seed,phase:'playing',x:NODE.x,y:NODE.y,health:100,heat:0,time:180,elapsed:0,cooldown:0,reveal:0,pulseAge:9,invuln:0,cargo:[],memories,holes,tanks:[{x:430,y:1030,base:430,y0:1030,range:210,speed:.28},{x:1230,y:780,base:1230,y0:780,range:260,speed:.22},{x:750,y:420,base:750,y0:420,range:290,speed:.32}],lures:[{x:1020,y:1020},{x:590,y:830},{x:1200,y:560},{x:820,y:250}],pombero:null,score:0,message:'Recuperá una memoria cercana y volvé al nodo para extraer.',messageId:1};
}
function say(g,s){g.message=s;g.messageId++;}
export function pulse(g){if(g.phase!=='playing'||g.cooldown>0)return false;g.reveal=3.4;g.pulseAge=0;g.cooldown=4.5;g.heat=Math.min(100,g.heat+24);say(g,g.heat>=60?'El Pombero escuchó el pulso. Bajá la actividad.':'Camino revelado. Recordá los píxeles muertos.');return true;}
export function extract(g){if(g.phase!=='playing'||distance(g,NODE)>78||!g.cargo.length)return false;g.phase='won';g.score=Math.round(g.cargo.length*250+g.health*2+g.time);return true;}
function hit(g,amount,text){if(g.invuln>0)return;g.health=Math.max(0,g.health-amount);g.invuln=1.8;say(g,text);}
export function step(g,dt,input={x:0,y:0}){
 if(g.phase!=='playing')return;dt=Math.min(Math.max(dt,0),.05);g.elapsed+=dt;g.time=Math.max(0,g.time-dt);g.cooldown=Math.max(0,g.cooldown-dt);g.reveal=Math.max(0,g.reveal-dt);g.pulseAge+=dt;g.invuln=Math.max(0,g.invuln-dt);g.heat=Math.max(0,g.heat-dt*1.6);
 const length=Math.hypot(input.x,input.y)||1;g.x=Math.max(30,Math.min(W-30,g.x+input.x/length*145*dt));g.y=Math.max(60,Math.min(H-40,g.y+input.y/length*145*dt));
 for(const m of g.memories)if(!m.collected&&distance(g,m)<27&&g.cargo.length<4){m.collected=true;g.cargo.push(m.id);say(g,g.cargo.length===4?'Carga completa. Volvé al nodo del sur.':`Memoria recuperada (${g.cargo.length}/4). Podés regresar o seguir.`);}
 for(const h of g.holes)if(distance(g,h)<h.r+7)hit(g,16,'Píxel muerto. Usá el pulso para revelar el terreno.');
 for(const t of g.tanks){t.x=t.base+Math.sin(g.elapsed*t.speed)*t.range;t.y=t.y0+Math.cos(g.elapsed*t.speed)*40;if(distance(g,t)<38)hit(g,24,'Hombre-Tanque: observá su recorrido y rodealo.');}
 for(const l of g.lures)if(distance(g,l)<29){hit(g,18,'Luz Mala. Las falsas memorias se vuelven rojas con el pulso.');}
 if(g.heat>=60&&!g.pombero){g.pombero={x:g.x>W/2?30:W-30,y:Math.max(90,g.y-200)};say(g,'Actividad crítica. El Pombero te rastrea. Dejá enfriar la red.');}
 if(g.pombero){if(g.heat<28){g.pombero=null;say(g,'El Pombero perdió tu señal.');}else{const d=distance(g,g.pombero)||1;g.pombero.x+=(g.x-g.pombero.x)/d*92*dt;g.pombero.y+=(g.y-g.pombero.y)/d*92*dt;if(d<32)hit(g,30,'El Pombero encontró tu señal. Seguí moviéndote.');}}
 if(g.health<=0||g.time<=0){g.phase='lost';say(g,g.health<=0?'Conexión fragmentada. La carga quedó en la ruta.':'Ventana de enlace cerrada. La carga quedó en la ruta.');}
}
export function readSave(storage){try{const d=JSON.parse(storage.getItem('austral-ruta404-v1')||'{}');return{known:[...new Set(Array.isArray(d.known)?d.known.filter(x=>Number.isInteger(x)&&x>=0&&x<12):[])],best:Number.isFinite(d.best)?Math.max(0,d.best):0};}catch{return{known:[],best:0};}}
export function bank(save,g){if(g.phase!=='won')return save;return{known:[...new Set([...save.known,...g.cargo])],best:Math.max(save.best,g.score)};}
