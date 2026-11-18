'use strict';

const main = document.querySelector('main');
const languageButton = document.querySelector('#language');
const preferences = {
  read(key, fallback) { try { return JSON.parse(localStorage.getItem('ruang-warisan-' + key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { try { localStorage.setItem('ruang-warisan-' + key, JSON.stringify(value)); } catch {} }
};
let language = preferences.read('language', 'en') === 'ms' ? 'ms' : 'en';
let done = preferences.read('trail', []);
if (!Array.isArray(done)) done = [];
let activeCamera = null;
let roomIndex = 0;
const bilingual = (english, malay) => language === 'ms' ? malay : english;
const T = bilingual;

const entries = [
  ['object', ['Explore an object', 'Terokai objek'], ['Rotate a replica and inspect its details.', 'Putar replika dan periksa butirannya.']],
  ['compare', ['Then and now', 'Dahulu dan sekarang'], ['Compare a timber hall with its reconstruction.', 'Bandingkan dewan kayu dengan rekonstruksinya.']],
  ['map', ['Gallery map', 'Peta galeri'], ['Find a route, including step-free options.', 'Cari laluan, termasuk pilihan tanpa tangga.']],
  ['gallery', ['Virtual gallery', 'Galeri maya'], ['Look around three modelled rooms.', 'Lihat sekeliling tiga bilik maya.']],
  ['trail', ['Discovery trail', 'Jejak penemuan'], ['Answer three questions and save your progress.', 'Jawab tiga soalan dan simpan kemajuan anda.']]
];

function stopCamera() {
  for (const track of activeCamera?.getTracks() ?? []) track.stop();
  activeCamera = null;
}
function screen(section, title, intro, body) {
  return `<article class="screen"><a href="#home" class="back">← ${T('Explore the galleries','Terokai galeri')}</a><p class="eyebrow">${section}</p><h1>${title}</h1><p class="intro">${intro}</p>${body}</article>`;
}
function button(text, id, c = '') {
  return `<button type="button" id="${id}" class="${c}">${text}</button>`;
}
function bind(id, fn) { document.getElementById(id).addEventListener('click', fn); }
function setText(id, text) { document.getElementById(id).textContent = text; }
function press(group, button) { for (const item of group) item.setAttribute('aria-pressed', String(item === button)); }

const profile = [[-1,.29],[-.86,.55],[-.66,.75],[-.37,.91],[-.02,.95],[.28,.87],[.52,.68],[.69,.52],[.83,.45],[.89,.51],[1,.51],[1,.4],[.79,.39],[.62,.43]];
const facets = 44;
function drawJar(canvas, rotation = 0, tilt = .2, size = 1, anchor = [.5,.52], shadow = true) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);
  const scale = h * .3 * size;
  const x0 = w * anchor[0], y0 = h * anchor[1];
  if (shadow) {
    const g = ctx.createRadialGradient(x0,y0+scale*.95,3,x0,y0+scale*.95,scale*.98);
    g.addColorStop(0,'#0d181765'); g.addColorStop(1,'#0d181700');
    ctx.save();ctx.translate(0, (y0+scale*.95)*.69);ctx.scale(1,.31);
    ctx.fillStyle = g;ctx.fillRect(x0-scale,y0-scale,scale*2,scale*3);ctx.restore();
  }
  function vertex(level, angle) {
    const [y,r] = profile[level]; const x=r*Math.cos(angle), z=r*Math.sin(angle);
    const ny=y*Math.cos(tilt)-z*Math.sin(tilt), nz=y*Math.sin(tilt)+z*Math.cos(tilt);
    const perspective=3.3/(3.3-nz);
    return [x0+x*scale*perspective,y0-ny*scale*perspective,nz];
  }
  const faces = [];
  for(let level=0;level<profile.length-1;level++) for(let index=0;index<facets;index++) {
    const a=index/facets*2*Math.PI+rotation, b=(index+1)/facets*2*Math.PI+rotation;
    const points=[vertex(level,a),vertex(level,b),vertex(level+1,b),vertex(level+1,a)];
    const light=.53+.46*Math.max(0,Math.cos((a+b)/2-2.03));
    const decoration=level===4||level===5;
    const motif=decoration ? (index%5===0 ? .6 : .83) : 1;
    const texture=.94+.06*Math.sin(index*15+level*3);
    const base=level>10?[90,51,32]:level===9?[237,170,103]:[211,132,77];
    const color=base.map(c=>Math.round(c*light*motif*texture));
    faces.push({points,z:points.reduce((v,p)=>v+p[2],0)/4,color:'rgb('+color.join(',')+')'});
  }
  faces.sort((a,b)=>a.z-b.z);
  for(const face of faces) {
    ctx.beginPath(); face.points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
    ctx.fillStyle=ctx.strokeStyle=face.color;ctx.lineWidth=1.2;ctx.fill();ctx.stroke();
  }
}

function dragCanvas(canvas, drag, key, tap) {
  let start;
  canvas.addEventListener('pointerdown', e => { start=[e.clientX,e.clientY,0];canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if(start) {const dx=e.clientX-start[0],dy=e.clientY-start[1];drag(dx,dy);start=[e.clientX,e.clientY,start[2]+Math.abs(dx)+Math.abs(dy)];} });
  canvas.addEventListener('pointerup', e => { if(start&&start[2]<5&&tap) {const r=canvas.getBoundingClientRect();tap(Math.min(.8,Math.max(.2,(e.clientX-r.left)/r.width)),Math.min(.7,Math.max(.32,(e.clientY-r.top)/r.height)));}start=null; });
  canvas.addEventListener('pointercancel',()=>{start=null;});
  canvas.addEventListener('keydown',e=>{ if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();key(e.key);} });
}

function home() {
  main.innerHTML=`<section class="hero"><div class="hero-copy"><p class="eyebrow">${T('Museum guide','Panduan muzium')}</p><h1>${T('Explore the galleries','Terokai galeri')}</h1><p>${T('Get close to a replica, look around the galleries or follow a trail from home.','Lihat replika dengan dekat, jelajahi galeri atau ikuti jejak dari rumah.')}</p><a class="button" href="#object">${T('Explore the earthenware jar','Terokai tempayan tanah liat')} →</a></div><div class="hero-art"><canvas width="690" height="480" aria-label="${T('Illustration of an earthenware jar','Ilustrasi tempayan tanah liat')}" role="img"></canvas><span>${T('GALLERY A · OBJECT A02','GALERI A · OBJEK A02')}</span></div></section><h2 class="grid-title">${T('Choose an experience','Pilih pengalaman')}</h2><div class="feature-grid">${entries.map(([id,title,desc],i)=>`<a class="feature" href="#${id}"><span class="index">0${i+1} / 05</span><h3>${T(...title)}</h3><p>${T(...desc)}</p></a>`).join('')}</div>`;
  drawJar(main.querySelector('canvas'),-.35,.27,1.02);
}
function object() {
  const details=[
    [T('Rim','Bibir'),T('The rounded rim reinforces the opening and gives the hand a place to grip.','Bibir bulat mengukuhkan bukaan dan memberi tempat untuk menggenggam.')],
    [T('Body','Badan'),T('The broad body holds the contents. The model narrows toward the base and neck.','Badan lebar menyimpan isi. Model ini mengecil ke arah tapak dan leher.')],
    [T('Decoration','Hiasan'),T('The dark geometric band is an illustrative design around the shoulder.','Jalur geometri gelap ialah hiasan ilustrasi di sekeliling bahu.')]
  ];
  main.innerHTML=screen(T('Gallery A · Object A02','Galeri A · Objek A02'),T('Earthenware jar','Tempayan tanah liat'),T('Rotate the 3D replica and select a hotspot to learn about its shape.','Putar replika 3D dan pilih titik maklumat untuk mengetahui bentuknya.'),`<div class="two"><div class="panel"><div id="object-stage" class="stage"><video hidden muted autoplay playsinline></video><canvas width="760" height="470" id="jar" tabindex="0" aria-label="${T('Jar replica. Use arrow keys to rotate.','Replika tempayan. Gunakan kekunci anak panah untuk memutar.')}"></canvas><span class="tag" id="object-mode">${T('3D viewer','Paparan 3D')}</span></div><div class="toolbar">${button('← '+T('Rotate','Putar'),'rotate-left')}${button(T('Rotate','Putar')+' →','rotate-right')}${button(T('Reset','Set semula'),'reset-jar')}</div><label for="jar-size">${T('Model size','Saiz model')}</label><input class="range" id="jar-size" type="range" min="55" max="120" value="90"></div><aside class="panel"><h2>${T('Object details','Butiran objek')}</h2><div class="tabs" id="hotspots">${details.map(([name],i)=>`<button aria-pressed="${i===0}" type="button">${name}</button>`).join('')}</div><p id="hotspot-detail" aria-live="polite">${details[0][1]}</p><div class="toolbar">${button(T('Try camera overlay','Cuba lapisan kamera'),'camera','primary')}${button(T('Open text view','Buka paparan teks'),'object-text')}</div><p id="camera-status" class="note" role="status">${T('Optional camera view. The model follows your tap on the screen.','Paparan kamera pilihan. Model mengikut sentuhan pada skrin.')}</p><div id="object-text-panel" hidden><ul>${details.map(([k,v])=>`<li><strong>${k}.</strong> ${v}</li>`).join('')}</ul></div></aside></div>`);
  const canvas=document.getElementById('jar'), stage=document.getElementById('object-stage');
  const video=stage.querySelector('video'), camera=document.getElementById('camera'), size=document.getElementById('jar-size');
  let rotation=-.3, tilt=.19, anchor=[.5,.52], cameraPending=false;
  const draw=()=>drawJar(canvas,rotation,tilt,Number(size.value)/100,anchor,video.hidden);
  const rotate=(dx,dy=0)=>{rotation+=dx;tilt=Math.max(-.25,Math.min(.57,tilt+dy));draw();};
  dragCanvas(canvas,(dx,dy)=>rotate(dx*.017,dy*.009),key=>rotate(key==='ArrowRight'?.25:key==='ArrowLeft'?-.25:0,key==='ArrowUp'?.08:key==='ArrowDown'?-.08:0),(x,y)=>{if(!video.hidden){anchor=[x,y];draw();}});
  bind('rotate-left',()=>rotate(-.32));bind('rotate-right',()=>rotate(.32));size.addEventListener('input',draw);
  bind('reset-jar',()=>{rotation=-.3;tilt=.19;anchor=[.5,.52];size.value=90;draw();});
  const hotspots=[...document.querySelectorAll('#hotspots button')];
  hotspots.forEach((item,i)=>item.addEventListener('click',()=>{press(hotspots,item);setText('hotspot-detail',details[i][1]);}));
  bind('object-text',()=>{const p=document.getElementById('object-text-panel');p.hidden=!p.hidden;});
  bind('camera',async()=>{
    if(cameraPending)return;
    if(activeCamera) {
      stopCamera();video.srcObject=null;video.hidden=true;stage.classList.remove('live');
      camera.textContent=T('Try camera overlay','Cuba lapisan kamera');setText('object-mode',T('3D viewer','Paparan 3D'));
      setText('camera-status',T('Camera closed. Use the 3D viewer or open the text view.','Kamera ditutup. Gunakan paparan 3D atau paparan teks.'));draw();return;
    }
    if(!navigator.mediaDevices?.getUserMedia){setText('camera-status',T('Camera unavailable in this browser. Continue in the 3D viewer.','Kamera tidak tersedia. Teruskan dengan paparan 3D.'));return;}
    cameraPending=true;camera.disabled=true;
    try {
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      if(!stage.isConnected){stream.getTracks().forEach(t=>t.stop());return;}
      activeCamera=stream;video.srcObject=stream;video.hidden=false;stage.classList.add('live');
      camera.textContent=T('Close camera','Tutup kamera');setText('object-mode',T('Camera overlay','Lapisan kamera'));
      setText('camera-status',T('Tap the video to move the replica. Camera video stays on this device.','Sentuh video untuk mengalihkan replika. Video kamera kekal pada peranti ini.'));draw();
    } catch {
      if(stage.isConnected)setText('camera-status',T('Camera permission was denied or the camera is unavailable. You can still rotate the replica.','Kebenaran kamera ditolak atau kamera tidak tersedia. Anda masih boleh memutar replika.'));
    } finally { cameraPending=false;camera.disabled=false; }
  });
  draw();
}

function drawHall(canvas, amount) {
  const c=canvas.getContext('2d'), w=canvas.width,h=canvas.height;
  function poly(p,fill){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();}
  function scene(reconstructed) {
    const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,reconstructed?'#becdb5':'#d7d0bc');sky.addColorStop(.67,'#dfd9bf');sky.addColorStop(.68,'#9ca482');sky.addColorStop(1,'#777e5d');
    c.fillStyle=sky;c.fillRect(0,0,w,h);
    poly([[0,347],[145,296],[315,339],[448,306],[720,345],[720,480],[0,480]],'#a5a67f');
    c.fillStyle='#65573d';c.fillRect(120,353,485,18);
    const wall=reconstructed?'#aa784a':'#807460';
    c.fillStyle=wall;c.fillRect(179,222,387,128);
    for(let x=182;x<562;x+=23){c.fillStyle=reconstructed?'#725239':'#6e6350';c.fillRect(x,228,5,122);}
    if(reconstructed){
      poly([[132,231],[244,121],[475,121],[611,229]],'#654033');
      poly([[137,222],[245,110],[479,109],[607,220]],'#87543b');
      for(let i=0;i<12;i++){c.strokeStyle='#a66e4f';c.beginPath();c.moveTo(246+i*20,116);c.lineTo(160+i*36,220);c.stroke();}
      poly([[213,147],[359,53],[512,147]],'#6b472f');
      poly([[244,142],[359,68],[475,142]],'#bb8055');
      c.fillStyle='#473f2e';c.fillRect(323,244,88,106);
      c.fillStyle='#d2aa71';c.fillRect(170,223,409,6);
    } else {
      poly([[159,231],[222,190],[348,203],[438,185],[575,217],[585,234]],'#67604d');
      c.fillStyle='#514b3d';c.fillRect(316,253,105,96);
    }
  }
  scene(false);c.save();c.beginPath();c.rect(0,0,w*amount/100,h);c.clip();scene(true);c.restore();
  if(amount>0&&amount<100) { c.strokeStyle='#fff4d5';c.lineWidth=4;c.beginPath();c.moveTo(w*amount/100,0);c.lineTo(w*amount/100,h);c.stroke(); }
}
function compare() {
  main.innerHTML=screen(T('Gallery B · Exhibit B01','Galeri B · Pameran B01'),T('Timber hall','Dewan kayu'),T('Move the divider to compare an illustrative display and a reconstructed hall.','Gerakkan pembahagi untuk membandingkan paparan ilustrasi dan dewan yang dibina semula.'),`<div class="two"><div class="panel"><div class="stage"><canvas id="hall" width="720" height="450" aria-label="${T('Comparison of the current display and a reconstruction','Perbandingan paparan semasa dengan rekonstruksi')}" role="img"></canvas><span class="tag" id="comparison-status">${T('Split comparison','Perbandingan berpecah')}</span></div><label for="compare-range">${T('Amount of reconstruction shown','Bahagian rekonstruksi yang ditunjukkan')}</label><input id="compare-range" class="range" type="range" min="0" max="100" value="50"><div class="toolbar">${button(T('Current display','Paparan semasa'),'current')}${button(T('Reconstruction','Rekonstruksi'),'reconstruct')}${button(T('Split view','Paparan berpecah'),'split')}</div></div><aside class="panel"><h2>${T('Exhibit notes','Nota pameran')}</h2><p>${T('The surviving display suggests the footprint and frame. The complete roof and its decorative gable are interpretations for this example.','Paparan yang tinggal menunjukkan tapak dan rangka. Bumbung lengkap dan tebar layarnya ialah tafsiran untuk contoh ini.')}</p><p class="fine">${T('The browser comparison uses illustrations for this prototype.','Perbandingan pelayar menggunakan ilustrasi untuk prototaip ini.')}</p><a class="button" href="#trail">${T('Return to discovery trail','Kembali ke jejak penemuan')}</a></aside></div>`);
  const range=document.getElementById('compare-range'), canvas=document.getElementById('hall');
  function update(value) { range.value=value;drawHall(canvas,Number(value));setText('comparison-status',Number(value)===0?T('Current display','Paparan semasa'):Number(value)===100?T('Reconstruction','Rekonstruksi'):T('Split comparison','Perbandingan berpecah')); }
  range.addEventListener('input',()=>update(range.value));bind('current',()=>update(0));bind('reconstruct',()=>update(100));bind('split',()=>update(50));update(50);
}

const points = {
  E:{pos:[90,312], label:['Entrance','Pintu masuk']}, J:{pos:[244,312],label:['Main junction','Persimpangan utama']},
  S:{pos:[244,159],label:['Stairs','Tangga']}, L:{pos:[524,312],label:['Lift','Lif']},
  A:{pos:[90,159],label:['Gallery A','Galeri A']}, B:{pos:[524,159],label:['Gallery B','Galeri B']}
};
const edges=[['E','J',18,'walk'],['E','A',16,'walk'],['A','S',15,'stairs'],['J','S',11,'stairs'],['S','B',14,'walk'],['J','L',21,'walk'],['L','B',12,'lift']];
function shortestRoute(start,end,stepFree,liftClosed) {
  const distances=Object.fromEntries(Object.keys(points).map(key=>[key,Infinity]));
  const previous={}, queue=new Set(Object.keys(points));
  distances[start]=0;
  while(queue.size) {
    const current=[...queue].sort((a,b)=>distances[a]-distances[b])[0];queue.delete(current);
    if(!Number.isFinite(distances[current]))break;
    if(current===end) {
      const path=[current];while(previous[path[0]])path.unshift(previous[path[0]]);
      return {path,distance:distances[end]};
    }
    for(const [a,b,length,type] of edges) {
      if(type==='stairs'&&stepFree||type==='lift'&&liftClosed)continue;
      const neighbor=current===a?b:current===b?a:null;
      if(neighbor&&queue.has(neighbor)&&distances[current]+length<distances[neighbor]){
        distances[neighbor]=distances[current]+length;previous[neighbor]=current;
      }
    }
  }
  return null;
}
function map() {
  const places=['E','A','B','L','J'];
  const placeName=key=>T(...points[key].label);
  const options=places.map(key=>`<option value="${key}">${placeName(key)}</option>`).join('');
  main.innerHTML=screen(T('On-site route','Laluan di muzium'),T('Gallery map','Peta galeri'),T('Choose a starting point and destination. The route updates when you change a preference.','Pilih titik mula dan destinasi. Laluan dikemas kini apabila pilihan berubah.'),`<div class="two"><div class="panel"><div id="map-canvas"></div><p class="note">${T('Illustrative layout. Follow posted signs during an actual visit.','Susun atur ilustrasi. Ikuti papan tanda semasa lawatan sebenar.')}</p></div><aside class="panel"><h2>${T('Plan a route','Rancang laluan')}</h2><div class="form-row"><label class="field">${T('From','Dari')}<select id="map-from">${options}</select></label><label class="field">${T('To','Ke')}<select id="map-to">${options}</select></label></div><label class="toggle"><input id="step-free" type="checkbox" checked> ${T('Step-free route','Laluan tanpa tangga')}</label><label class="toggle"><input id="lift-closed" type="checkbox"> ${T('Simulate lift closure','Simulasi penutupan lif')}</label><div id="route-directions" aria-live="polite"></div><details><summary>${T('Enter a checkpoint code','Masukkan kod titik semak')}</summary><form id="checkpoint" class="form-row"><label class="field">${T('Checkpoint code','Kod titik semak')}<input id="checkpoint-code" placeholder="ENT" maxlength="10" required></label><button class="primary">${T('Confirm','Sahkan')}</button></form><p class="note">${T('Try ENT, LIFT, A or B.','Cuba ENT, LIFT, A atau B.')}</p><p id="checkpoint-status" class="stat" role="status"></p></details></aside></div>`);
  const start=document.getElementById('map-from'),end=document.getElementById('map-to'),step=document.getElementById('step-free'),lift=document.getElementById('lift-closed');
  end.value='B';
  function update() {
    const found=shortestRoute(start.value,end.value,step.checked,lift.checked);
    const lines=edges.map(([a,b,_,type])=>`<line x1="${points[a].pos[0]}" y1="${points[a].pos[1]}" x2="${points[b].pos[0]}" y2="${points[b].pos[1]}" stroke="${type==='lift'&&lift.checked?'#a45645':'#a7b5a4'}" stroke-width="6" ${type!=='walk'?'stroke-dasharray="8 7"':''}/>`).join('');
    const route=found?`<polyline points="${found.path.map(key=>points[key].pos.join(',')).join(' ')}" stroke="#226449" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`:'';
    const labels=Object.entries(points).map(([key,point])=>`<circle cx="${point.pos[0]}" cy="${point.pos[1]}" r="9" fill="${found?.path.includes(key)?'#226449':'#768a79'}"/><text x="${point.pos[0]}" y="${point.pos[1]-(point.pos[1]<200?26: -38)}" text-anchor="middle" fill="#253d31" font-size="19" font-weight="700">${placeName(key)}</text>`).join('');
    document.getElementById('map-canvas').innerHTML=`<svg class="route-svg" viewBox="0 0 620 405" role="img" aria-label="${T('Illustrative floor plan, see route directions for text','Pelan lantai ilustrasi, lihat arahan laluan untuk teks')}"><rect x="30" y="71" width="556" height="302" rx="15" fill="#e4e8da" stroke="#cdd8c8"/><rect x="39" y="85" width="104" height="123" rx="10" fill="#d2dfd0"/><rect x="467" y="85" width="103" height="123" rx="10" fill="#d2dfd0"/><text x="41" y="53" font-size="23" fill="#253d31" font-weight="700">${T('Gallery level','Aras galeri')}</text>${lines}${route}${labels}</svg>`;
    document.getElementById('route-directions').innerHTML=found ? `<p class="stat">${found.path.length===1?T('You are already there.','Anda sudah berada di sana.'):`${step.checked?T('Step-free route','Laluan tanpa tangga'):T('Suggested route','Laluan disyorkan')} · ${found.distance} m`}</p><ol class="routes">${found.path.map(key=>`<li>${placeName(key)}</li>`).join('')}</ol>` : `<p class="notice">${T('No route matches these options. Try another destination or ask staff for assistance.','Tiada laluan yang sepadan. Cuba destinasi lain atau minta bantuan kakitangan.')}</p>`;
  }
  [start,end,step,lift].forEach(x=>x.addEventListener('change',update));
  document.getElementById('checkpoint').addEventListener('submit',e=>{
    e.preventDefault();const value=document.getElementById('checkpoint-code').value.trim().toUpperCase();
    const key={ENT:'E',LIFT:'L',A:'A',B:'B'}[value];
    if(!Object.hasOwn(points,key)){setText('checkpoint-status',T('Code not recognized. Try ENT, LIFT, A or B.','Kod tidak dikenali. Cuba ENT, LIFT, A atau B.'));return;}
    start.value=key;setText('checkpoint-status',T('Starting point confirmed.','Titik mula disahkan.'));update();
  });
  update();
}

const rooms=[
  {name:['Gallery A','Galeri A'],title:['Earthenware jar','Tempayan tanah liat'],point:['Jar exhibit','Pameran tempayan'],desc:['A vessel with a broad body, narrow neck and a decorative band.','Bekas berbadan lebar dengan leher sempit dan jalur hiasan.'],link:'#object',base:[153,127,88]},
  {name:['Gallery B','Galeri B'],title:['Timber hall','Dewan kayu'],point:['Timber hall exhibit','Pameran dewan kayu'],desc:['The surviving frame gives clues about the building footprint and roof supports.','Rangka yang tinggal memberi petunjuk tentang tapak bangunan dan sokongan bumbung.'],link:'#compare',base:[124,132,102]},
  {name:['Gallery C','Galeri C'],title:['Gallery story','Kisah galeri'],point:['Gallery story exhibit','Pameran kisah galeri'],desc:['An exhibit label distinguishes evidence from reconstructed details.','Label pameran membezakan bukti daripada butiran rekonstruksi.'],link:'#trail',base:[142,119,108]}
];
function drawRoom(canvas,yaw,room) {
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const sky=c.createLinearGradient(0,0,0,h/2);sky.addColorStop(0,'#ddd0af');sky.addColorStop(1,'#bbac8e');
  const floor=c.createLinearGradient(0,h/2,0,h);floor.addColorStop(0,'#756149');floor.addColorStop(1,'#a28560');
  c.fillStyle=sky;c.fillRect(0,0,w,h/2);c.fillStyle=floor;c.fillRect(0,h/2,w,h/2);
  for(let x=0;x<w;x+=2){
    const local=Math.atan((x-w/2)/(w*.58)),a=yaw+local, dx=Math.cos(a),dy=Math.sin(a);
    const vertical=5/Math.abs(dx),horizontal=5/Math.abs(dy),distance=Math.min(vertical,horizontal);
    const side=vertical<horizontal? (dx>0?0:2):(dy>0?1:3);
    const position=((vertical<horizontal?distance*dy:distance*dx)+5)/10;
    const wallHeight=h*3.9/(distance*Math.cos(local)), y=(h-wallHeight)/2;
    const lighting=(side%2?.79:1)*(Math.floor(position*36)%9===0?.86:1);
    const color=room.base.map(v=>Math.round(v*lighting));
    c.fillStyle=`rgb(${color.join(',')})`;c.fillRect(x,y,2,wallHeight);
    if(position>.23&&position<.77) {
      c.fillStyle='#584832';c.fillRect(x,y+wallHeight*.29,2,wallHeight*.49);
      if(position>.275&&position<.725){c.fillStyle=side===0?'#6a7b61':'#849382';c.fillRect(x,y+wallHeight*.34,2,wallHeight*.34);}
      if(side===0&&position>.4&&position<.6){const shape=1-((position-.5)/.1)**2;c.fillStyle='#d2a578';c.fillRect(x,y+wallHeight*(.59-.15*Math.max(0,shape)),2,wallHeight*.12*Math.max(0,shape));}
    }
    c.fillStyle='#463b30';c.fillRect(x,y+wallHeight*.91,2,wallHeight*.085);
    c.fillStyle='#d1bc8c';c.fillRect(x,y+wallHeight*.13,2,wallHeight*.028);
  }
  const vignette=c.createRadialGradient(w/2,h/2,w*.09,w/2,h/2,w*.57);vignette.addColorStop(0,'transparent');vignette.addColorStop(1,'#30221448');c.fillStyle=vignette;c.fillRect(0,0,w,h);
}
function gallery() {
  const room=rooms[roomIndex];let yaw=0;
  main.innerHTML=screen(T('Remote tour','Lawatan jarak jauh'),T(...room.name),T('Drag the view or use the arrows to look around. Open the exhibit hotspot for its story.','Seret paparan atau gunakan anak panah untuk melihat sekeliling. Buka titik pameran untuk mengetahui kisahnya.'),`<div class="two"><div class="panel"><div class="stage"><canvas width="740" height="460" id="room" tabindex="0" aria-label="${T('Virtual gallery. Use left and right arrows to look around.','Galeri maya. Gunakan anak panah kiri dan kanan untuk melihat sekeliling.')}"></canvas><span class="tag">${T('360° room model','Model bilik 360°')}</span></div><div class="toolbar">${button('← '+T('Look left','Lihat kiri'),'look-left')}${button(T('Look right','Lihat kanan')+' →','look-right')}${button(T('Reset view','Set semula paparan'),'reset-room')}</div></div><aside class="panel"><h2>${T('Room','Bilik')} ${roomIndex+1} / ${rooms.length}</h2>${button('+ '+T(...room.point),'room-hotspot','primary')}<div id="room-exhibit" hidden><h3>${T(...room.title)}</h3><p>${T(...room.desc)}</p><a href="${room.link}">${T('Explore further','Terokai dengan lebih lanjut')}</a></div><div class="toolbar">${button(T('Previous room','Bilik sebelumnya'),'room-prev')}${button(T('Next room','Bilik seterusnya'),'room-next')}</div><details class="note"><summary>${T('Text tour','Lawatan teks')}</summary><ol class="gallery-list">${rooms.map(r=>`<li><strong>${T(...r.name)}.</strong> ${T(...r.title)}. ${T(...r.desc)}</li>`).join('')}</ol></details></aside></div>`);
  const canvas=document.getElementById('room'),draw=()=>drawRoom(canvas,yaw,room);
  const rotate=(d)=>{yaw=(yaw+d)%(Math.PI*2);draw();};
  dragCanvas(canvas,dx=>rotate(-dx*.011),key=>{if(key==='ArrowLeft'||key==='ArrowRight')rotate(key==='ArrowLeft'?-.3:.3);});
  bind('look-left',()=>rotate(-.38));bind('look-right',()=>rotate(.38));bind('reset-room',()=>{yaw=0;draw();});
  bind('room-hotspot',()=>{const item=document.getElementById('room-exhibit');item.hidden=!item.hidden;document.getElementById('room-hotspot').setAttribute('aria-expanded',String(!item.hidden));});
  function switchRoom(d,focus){roomIndex=(roomIndex+rooms.length+d)%rooms.length;gallery();document.getElementById(focus).focus();}
  bind('room-next',()=>switchRoom(1,'room-next'));bind('room-prev',()=>switchRoom(-1,'room-prev'));draw();
}

const questions=[
  {title:['Earthenware jar','Tempayan tanah liat'],link:'#object',q:['Which part reinforces the jar opening?','Bahagian manakah yang mengukuhkan bukaan tempayan?'],choices:[['The rim','Bibir'],['The body','Badan'],['The base','Tapak']],correct:0,why:['The rim surrounds the opening and gives the hand a place to grip.','Bibir mengelilingi bukaan dan memberi tempat untuk menggenggam.']},
  {title:['Timber hall','Dewan kayu'],link:'#compare',q:['Which part of the reconstruction is an interpretation?','Bahagian rekonstruksi manakah yang merupakan tafsiran?'],choices:[['The surviving frame','Rangka yang masih ada'],['The complete roof and gable','Bumbung lengkap dan tebar layar'],['The location of the frame','Lokasi rangka']],correct:1,why:['The complete roof and decorative gable are illustrative additions.','Bumbung lengkap dan tebar layar berhias ialah tambahan ilustrasi.']},
  {title:['Gallery story','Kisah galeri'],link:'#gallery',q:['What should a label clarify?','Apakah yang perlu dijelaskan oleh label?'],choices:[['The brightness of the room','Kecerahan bilik'],['The order of visiting only','Susunan lawatan sahaja'],['Which details are reconstructed','Butiran yang direkonstruksi']],correct:2,why:['A label should help visitors distinguish evidence from interpretation.','Label perlu membantu pelawat membezakan bukti daripada tafsiran.']}
];
function trail(selected=-1) {
  const count=questions.filter((_,i)=>done.includes(i)).length;
  main.innerHTML=screen(T('Independent activity','Aktiviti kendiri'),T('Discovery trail','Jejak penemuan'),T('Explore the exhibits and answer one question at each stop. Your progress is saved in this browser.','Terokai pameran dan jawab satu soalan di setiap hentian. Kemajuan disimpan dalam pelayar ini.'),`<div class="two"><div>${questions.map((q,i)=>`<div class="trail-item"><div><h3>${i+1}. ${T(...q.title)}</h3><p>${done.includes(i)?T('Completed','Selesai'):T('Ready to explore','Sedia diterokai')}</p></div><button data-stop="${i}" type="button">${T('Open stop','Buka hentian')}</button></div>`).join('')}<div id="trail-question" class="panel" hidden></div></div><aside class="panel"><h2>${T('Your progress','Kemajuan anda')}</h2><p class="metric">${count} / ${questions.length}</p><progress value="${count}" max="${questions.length}" aria-label="${T('Trail progress','Kemajuan jejak')}"></progress><p class="fine">${count===questions.length?T('All stops completed.','Semua hentian selesai.'):T('Complete all three stops to finish the trail.','Lengkapkan ketiga-tiga hentian untuk menamatkan jejak.')}</p>${button(T('Reset progress','Set semula kemajuan'),'reset-trail')}</aside></div>`);
  const panel=document.getElementById('trail-question');
  function question(i,focus) {
    const q=questions[i];panel.hidden=false;
    panel.innerHTML=`<h2 tabindex="-1">${T(...q.title)}</h2><a href="${q.link}">${T('Open exhibit','Buka pameran')}</a><p>${T(...q.q)}</p><div class="answer-list">${q.choices.map(choice=>`<button type="button" aria-pressed="false">${T(...choice)}</button>`).join('')}</div><p role="status" class="stat">${done.includes(i)?T('Completed.','Selesai.'):''}</p>`;
    const buttons=[...panel.querySelectorAll('button')];
    buttons.forEach((b,n)=>b.addEventListener('click',()=>{
      press(buttons,b);
      if(n===q.correct){
        if(!done.includes(i)){done.push(i);preferences.write('trail',done);}
        trail(i);
        const updated=document.getElementById('trail-question');
        press([...updated.querySelectorAll('button')],updated.querySelectorAll('button')[n]);
        updated.querySelector('[role=status]').textContent=T('Correct. ','Betul. ')+T(...q.why);
        updated.querySelectorAll('button')[n].focus();
      } else panel.querySelector('[role=status]').textContent=T('Try again. Review the exhibit details for a clue.','Cuba lagi. Semak butiran pameran untuk petunjuk.');
    }));
    if(focus)panel.querySelector('h2').focus();
  }
  main.querySelectorAll('[data-stop]').forEach(b=>b.addEventListener('click',()=>question(Number(b.dataset.stop),true)));
  bind('reset-trail',()=>{done=[];preferences.write('trail',done);trail();document.getElementById('reset-trail').focus();});
  if(selected>=0)question(selected,false);
}

const screens={home,object,compare,map,gallery,trail};
function render(focus=false) {
  stopCamera();
  const route=location.hash.slice(1);
  const key=Object.hasOwn(screens,route)?route:'home';
  const words={guide:T('MUSEUM GUIDE','PANDUAN MUZIUM'),home:T('Explore','Terokai'),map:T('Map','Peta'),gallery:T('Gallery','Galeri'),trail:T('Trail','Jejak'),note:T('HCI alpha prototype · Illustrative exhibits and routes','Prototaip alfa HCI · Pameran dan laluan ilustrasi')};
  document.documentElement.lang=language;
  document.querySelector('.skip').textContent=T('Skip to content','Langkau ke kandungan');
  for(const element of document.querySelectorAll('[data-t]'))element.textContent=words[element.dataset.t];
  for(const element of document.querySelectorAll('nav a')){
    if(element.getAttribute('href')==='#'+key)element.setAttribute('aria-current','page');else element.removeAttribute('aria-current');
  }
  languageButton.textContent=T('EN / BM','BM / EN');
  languageButton.setAttribute('aria-label',T('Switch to Bahasa Melayu','Tukar kepada bahasa Inggeris'));
  screens[key]();
  if(focus){window.scrollTo(0,0);main.focus({preventScroll:true});}
}
languageButton.addEventListener('click',()=>{language=language==='en'?'ms':'en';preferences.write('language',language);render();});
window.addEventListener('hashchange',()=>{if(location.hash!=='#main')render(true);});
window.addEventListener('pagehide',stopCamera);
render();
