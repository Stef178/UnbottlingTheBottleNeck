/* ------------------ koelkast interactie ------------------ */
document.addEventListener("DOMContentLoaded", () => {
  const fridge = d3.select("#fridge-image");
  const overlay = d3.select("#fridge-overlay");
  const trashBtn = d3.select(".step.weggooien img");
  const trashOverlay = d3.select("#trash-overlay");

  fridge.on("click", async () => {
    const isActive = overlay.classed("active");
    if (!isActive) {
      overlay.classed("active", true);
      overlay.html(`
        <img src="assets/icons/koelkastopen.svg" alt="Koelkast open" id="open-fridge" />
        <div class="fridge-shelves">
          <div class="shelf" id="shelf-top"></div>
          <div class="shelf" id="shelf-middle-top"></div>
          <div class="shelf" id="shelf-middle-bottom"></div>
          <div class="shelf" id="shelf-bottom"></div>
        </div>
      `);
      try {
        const data = await d3.csv("data.csv");
        fillFridge(data);
      } catch (err) {
        console.error("Fout bij laden CSV:", err);
      }
    }
  });

  overlay.on("click", (event) => {
    const clickedInside = event.target.closest("#open-fridge");
    if (!clickedInside) overlay.classed("active", false).html("");
  });

  // trash overlay (teamgenoot)
  trashBtn.on("click", async () => {
    const isActive = trashOverlay.classed("active");
    if (!isActive) {
      trashOverlay.classed("active", true);
      trashOverlay.html(`
        <div class="trash-content">
          <div class="trash-visual">
            <img src="assets/icons/trashlid.svg" alt="Prullenbak open" id="open-trash" />
            <div class="trash-stacks" id="trash-stacks"></div>
          </div>
        </div>
      `);
      try {
        const data = await d3.csv("data.csv");
        fillTrash(data);
      } catch (err) {
        console.error("Fout bij laden CSV:", err);
      }
    }
  });

  trashOverlay.on("click", (event) => {
    const clickedInside = event.target.closest("#open-trash");
    if (!clickedInside) trashOverlay.classed("active", false).html("");
  });
});

function fillFridge(data) {
  const shelves = {
    top: d3.select("#shelf-top"),
    middleTop: d3.select("#shelf-middle-top"),
    middleBottom: d3.select("#shelf-middle-bottom"),
    bottom: d3.select("#shelf-bottom"),
  };

  const typeMap = {
    "Klein flesje": { file: "kleinflesje", shelf: "top" },
    Glas:           { file: "glas",         shelf: "middleTop" },
    Blikjes:        { file: "blikje",       shelf: "middleBottom" },
    "Grote flessen":{ file: "grotefles",    shelf: "bottom" },
  };

  Object.values(shelves).forEach((s) => s.html(""));

  data.forEach((row) => {
    const type = row["Type verpakking"];
    const info = typeMap[type];
    if (!info) return;

    const percentStr = String(row["%Opgeborgen"]).replace("%","").replace(",",".").trim();
    const percent = parseFloat(percentStr) || 0;
    const count = Math.max(1, Math.round((percent / 100) * 10));

    const shelf = shelves[info.shelf];
    for (let i = 0; i < count; i++) {
      const img = shelf.append("img")
        .attr("src", `assets/icons/${info.file}.svg`)
        .attr("alt", type)
        .attr("class", "item");
      setTimeout(() => img.classed("visible", true), i * 70);
    }
  });
}

function fillTrash(data) {
  const container = d3.select("#trash-stacks");
  container.html("");

  const typeMap = {
    "Grote flessen": { file: "grotefles",   statiegeld: "€0,25" },
    "Klein flesje":  { file: "kleinflesje", statiegeld: "€0,15" },
    Blikjes:         { file: "blikje",      statiegeld: "€0,15" },
    Glas:            { file: "glas",        statiegeld: "€0,10" },
  };

  data.forEach((row) => {
    const type = row["Type verpakking"];
    const info = typeMap[type];
    if (!info) return;

    const percentStr = String(row["%Weggegooid"]).replace("%","").replace(",",".").trim();
    const percent = parseFloat(percentStr) || 0;
    const heightCount = Math.round((percent / 100) * 10);

    const col = container.append("div").attr("class", "trash-column");
    col.append("div").attr("class", "trash-label").text(`${percent}% ${type}`);

    for (let i = 0; i < heightCount; i++) {
      const img = col.append("img").attr("src", `assets/icons/${info.file}.svg`).attr("alt", type);
      setTimeout(() => img.classed("visible", true), i * 80);
    }

    col.append("div").attr("class", "trash-money").text(info.statiegeld);
  });
}

/* ------------------ dynamische lijnen (vier banden) ------------------ */
const flows = d3.select("#flows");
const W = 1200, H = 600;

function centerInViewBox(sel){
  const el  = document.querySelector(sel);
  const box = document.querySelector('.visual').getBoundingClientRect();
  const r   = el.getBoundingClientRect();
  return {
    x: ((r.left - box.left) + r.width/2) / box.width  * W,
    y: ((r.top  - box.top ) + r.height/2)             / box.height * H
  };
}
function pFloat(s){ return parseFloat(String(s).replace('%','').replace(',','.')); }

/* A) Consumeren → Inleveren (dikte op basis van %Ingeleverd) */
async function loadTopValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const row = rows.find(r => r["Type verpakking"] === type);
    if(!row) return 0;
    const n  = +row["Unieke verpakkingen"] || 0;
    const pi = (pFloat(row["%Ingeleverd"]) || 0) / 100;
    return n * pi;
  }
  return {
    grote:  val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik:   val("Blikjes"),
    glas:   val("Glas")
  };
}

function drawTopBands(values){
  const p1 = centerInViewBox(".consumeren");
  const p2 = centerInViewBox(".inleveren");

  const padStart = 60;   // links inkorten
  const padEnd   = 120;  // rechts inkorten
  const yOffset  = -10;  // iets omhoog

  const xLeft  = Math.min(p1.x, p2.x) + padStart;
  const xRight = Math.max(p1.x, p2.x) - padEnd;
  const y      = (p1.y + p2.y) / 2 + yOffset;

  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const w = d3.scaleLinear().domain([0, maxVal]).range([4, 26]);

  const bands = [
    {key:"grote",  color:"#000000"},
    {key:"kleine", color:"#1f6f32"},
    {key:"blik",   color:"#FFD400"},
    {key:"glas",   color:"#A9713A"}
  ];

  const gaps = 2;
  const heights = bands.map(b => w(values[b.key]));
  const totalH = heights.reduce((a,b)=>a+b,0) + gaps*(bands.length-1);
  let yCursor = y - totalH/2;

  // ruggengraat
  flows.append("line")
    .attr("x1", xLeft).attr("y1", y)
    .attr("x2", xRight).attr("y2", y)
    .attr("stroke", "#111").attr("stroke-width", 4)
    .attr("opacity", 0.25).attr("stroke-linecap","butt");

  bands.forEach((b, i)=>{
    const h = heights[i];
    const yBand = yCursor + h/2;
    flows.append("line")
      .attr("x1", xLeft).attr("y1", yBand)
      .attr("x2", xRight).attr("y2", yBand)
      .attr("stroke", b.color)
      .attr("stroke-width", h)
      .attr("stroke-linecap", "butt");
    yCursor += h + gaps;
  });
}

/* B) Kopen → Consumeren (dikte op basis van %Weggegooid) */
async function loadBuyValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const row = rows.find(r => r["Type verpakking"] === type);
    if(!row) return 0;
    const n  = +row["Unieke verpakkingen"] || 0;
    const pi = (pFloat(row["%Weggegooid"]) || 0) / 100; // OF gebruik %Opgeborgen / %Ingeleverd
    return n * pi;
  }
  return {
    grote:  val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik:   val("Blikjes"),
    glas:   val("Glas")
  };
}

function drawBuyLine(values){
  const p1 = centerInViewBox(".kopen");
  const p2 = centerInViewBox(".consumeren");

  // lichte positionering (pas aan naar smaak)
  p1.x += 0;
  p1.y += 0;
  p2.x -= 0;
  p2.y += 0;

  // hoeveel wil je aan de Consumeren-kant inkorten (px)?
  const TRIM_END = 50; // verhoog/ verlaag tot hij niet meer over het icoon gaat

  // helpers: trim langs de lijn + pad met loodrechte offset (caps blijven gelijk)
  function trimSegment(a, b, trimStartPx, trimEndPx){
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    return {
      a: { x: a.x + ux * trimStartPx, y: a.y + uy * trimStartPx },
      b: { x: b.x - ux * trimEndPx,   y: b.y - uy * trimEndPx }
    };
  }
  function pathWithOffset(a, b, offset){
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // normale
    const sx = nx * offset, sy = ny * offset;
    return `M${a.x + sx},${a.y + sy} L${b.x + sx},${b.y + sy}`;
  }

  // trim alleen aan het einde (consumeren)
  const { a, b } = trimSegment(p1, p2, 0, TRIM_END);

  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const w = d3.scaleLinear().domain([0, maxVal]).range([4, 26]);

  const bands = [
    {key:"grote",  color:"#000000"},
    {key:"kleine", color:"#1f6f32"},
    {key:"blik",   color:"#FFD400"},
    {key:"glas",   color:"#A9713A"}
  ];

  const gaps = 2;
  const heights = bands.map(bd => w(values[bd.key]));
  const totalH = heights.reduce((x,y)=>x+y,0) + gaps*(bands.length-1);

  // schaduw/middenlijn
  flows.append("path")
    .attr("d", pathWithOffset(a, b, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 4)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  // stroken netjes parallel, zelfde eindpunt
  let cursor = -totalH/2;
  bands.forEach((bd, i) => {
    const h = heights[i];
    const offset = cursor + h/2;
    flows.append("path")
      .attr("d", pathWithOffset(a, b, offset))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", h)
      .attr("stroke-linecap", "butt");
    cursor += h + gaps;
  });
}



/* C) Kopen → Opbergen (dikte op basis van %Opgeborgen) */
async function loadStoreValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const row = rows.find(r => r["Type verpakking"] === type);
    if(!row) return 0;
    const n  = +row["Unieke verpakkingen"] || 0;
    const p  = (pFloat(row["%Opgeborgen"]) || 0) / 100;
    return n * p;
  }
  return {
    grote:  val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik:   val("Blikjes"),
    glas:   val("Glas")
  };
}

function drawStoreLine(values){
  const p1 = centerInViewBox(".kopen");
  const p2 = centerInViewBox(".opbergen");

  // lichte positionering (pas aan naar smaak)
  p1.x += 0;
  p1.y += 50;
  p2.x -= 0;
  p2.y -= 0;

  // hoeveel inkorten? (zelfde aanpak als bij drawBuyLine)
  const TRIM_START = 0; // korter aan de Kopen-kant
  const TRIM_END   = 110; // korter aan de Opbergen-kant

  // helpers: trim langs de lijn + pad met loodrechte offset
  function trimSegment(a, b, trimStartPx, trimEndPx){
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    return {
      a: { x: a.x + ux * trimStartPx, y: a.y + uy * trimStartPx },
      b: { x: b.x - ux * trimEndPx,   y: b.y - uy * trimEndPx }
    };
  }
  function pathWithOffset(a, b, offset){
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // eenheidsnormaal
    const sx = nx * offset, sy = ny * offset;
    return `M${a.x + sx},${a.y + sy} L${b.x + sx},${b.y + sy}`;
  }

  // trimmen
  const { a, b } = trimSegment(p1, p2, TRIM_START, TRIM_END);

  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const w = d3.scaleLinear().domain([0, maxVal]).range([4, 26]);

  const bands = [
    {key:"grote",  color:"#000000"},
    {key:"kleine", color:"#1f6f32"},
    {key:"blik",   color:"#FFD400"},
    {key:"glas",   color:"#A9713A"}
  ];

  const gaps = 2;
  const heights = bands.map(bd => w(values[bd.key]));
  const totalH = heights.reduce((x,y)=>x+y,0) + gaps*(bands.length-1);

  // ruggengraat/middenlijn
  flows.append("path")
    .attr("d", pathWithOffset(a, b, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 4)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  // vier banden, eindigen exact gelijk
  let cursor = -totalH/2;
  bands.forEach((bd, i) => {
    const h = heights[i];
    const offset = cursor + h/2;
    flows.append("path")
      .attr("d", pathWithOffset(a, b, offset))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", h)
      .attr("stroke-linecap", "butt");
    cursor += h + gaps;
  });
}


/* init: teken alle lijnen (één keer flows leegmaken) */
async function initTop(){
  flows.selectAll("*").remove();

  const topValues = await loadTopValues();
  drawTopBands(topValues);

  const buyValues = await loadBuyValues();
  drawBuyLine(buyValues);

  const storeValues = await loadStoreValues();   // nieuw
  drawStoreLine(storeValues);                    // nieuw
}


window.addEventListener("load",  initTop);
window.addEventListener("resize", initTop);

/* ===================== TOEGEVOEGD: Opbergen ↔ Consumeren bidirectioneel ===================== */

/* Helpers (globaal, unieke namen om niets te overschrijven) */
function segTrim(a, b, trimStartPx, trimEndPx){
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  return {
    a: { x: a.x + ux * trimStartPx, y: a.y + uy * trimStartPx },
    b: { x: b.x - ux * trimEndPx,   y: b.y - uy * trimEndPx }
  };
}
function offsetPath(a, b, offset){
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len; // eenheidsnormaal
  const sx = nx * offset, sy = ny * offset;
  return `M${a.x + sx},${a.y + sy} L${b.x + sx},${b.y + sy}`;
}

/* Data-loaders voor de nieuwe richtingen */
async function loadFridgeToConsumeValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const r = rows.find(x => x["Type verpakking"] === type);
    if(!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%UitKoelkast"]) || 0) / 100; // nieuwe kolom
    return n * p;
  }
  return { grote: val("Grote flessen"), kleine: val("Klein flesje"), blik: val("Blikjes"), glas: val("Glas") };
}
async function loadConsumeToFridgeValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const r = rows.find(x => x["Type verpakking"] === type);
    if(!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%TerugKoelkast"]) || 0) / 100; // nieuwe kolom
    return n * p;
  }
  return { grote: val("Grote flessen"), kleine: val("Klein flesje"), blik: val("Blikjes"), glas: val("Glas") };
}
// === instellingen voor dikte/afstand (makkelijk bijstellen) ===
const FLOW_MIN_W = 3;     // dunste band
const FLOW_MAX_W = 18;    // dikste band  (was 26)
const FLOW_GAP   = 1.5;   // ruimte tussen banden
const LANE_SEP   = 55;    // afstand tussen heen- en terugbaan

/* Tekenen: Opbergen -> Consumeren (heen) */
function drawFridgeToConsume(values){
  const pA = centerInViewBox(".opbergen");
  const pB = centerInViewBox(".consumeren");

  // kleine visuele correcties
  pA.x += 40; pA.y -= 6;
  pB.x += 40;  pB.y += 6;

  // korter maken: meer trimmen
  const { a, b } = segTrim(pA, pB, 130, 130); // start 30px na opbergen, stop 80px vóór consumeren

  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([FLOW_MIN_W, FLOW_MAX_W]);

  const bands = [
    {key:"grote",  color:"#000000", w: scaleW(values.grote)},
    {key:"kleine", color:"#1f6f32", w: scaleW(values.kleine)},
    {key:"blik",   color:"#FFD400", w: scaleW(values.blik)},
    {key:"glas",   color:"#A9713A", w: scaleW(values.glas)}
  ];

  const totalH = bands.reduce((s,x)=>s+x.w,0) + FLOW_GAP*(bands.length-1);

  // middenlijn schaduw (ook dunner)
  flows.append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill","none").attr("stroke","#111").attr("stroke-width",3)
    .attr("opacity",0.25).attr("stroke-linecap","round");

  // banden
  let cursor = -totalH/2;
  bands.forEach(bd => {
    const off = cursor + bd.w/2;
    flows.append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill","none").attr("stroke", bd.color).attr("stroke-width", bd.w)
      .attr("stroke-linecap","butt");
    cursor += bd.w + FLOW_GAP;
  });
}

/* Tekenen: Consumeren -> Opbergen (terug), parallel langs de heenlijn */
function drawConsumeToFridge(values){
  const pA = centerInViewBox(".consumeren");
  const pB = centerInViewBox(".opbergen");

  // kleine correcties
  pA.x -= -10;  pA.y += 10;
  pB.x -= -10;  pB.y -= 10;

  // korter maken aan beide kanten
  const trimmed = segTrim(pA, pB, 125, 125);  // 60px na consumeren starten, 40px vóór opbergen stoppen

  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([FLOW_MIN_W, FLOW_MAX_W]);

  const bands = [
    {key:"grote",  color:"#000000", w: scaleW(values.grote)},
    {key:"kleine", color:"#1f6f32", w: scaleW(values.kleine)},
    {key:"blik",   color:"#FFD400", w: scaleW(values.blik)},
    {key:"glas",   color:"#A9713A", w: scaleW(values.glas)}
  ];

  const totalH = bands.reduce((s,x)=>s+x.w,0) + FLOW_GAP*(bands.length-1);

  // helper voor lane-offset
  function lanePath(a,b,laneOffset,bandOffset){
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const sx = nx * (laneOffset + bandOffset), sy = ny * (laneOffset + bandOffset);
    return `M${a.x + sx},${a.y + sy} L${b.x + sx},${b.y + sy}`;
  }

  // middenlijn schaduw (dunner)
  flows.append("path")
    .attr("d", lanePath(trimmed.a, trimmed.b, LANE_SEP, 0))
    .attr("fill","none").attr("stroke","#111").attr("stroke-width",3)
    .attr("opacity",0.25).attr("stroke-linecap","round");

  // banden
  let cursor = -totalH/2;
  bands.forEach(bd => {
    const off = cursor + bd.w/2;
    flows.append("path")
      .attr("d", lanePath(trimmed.a, trimmed.b, LANE_SEP, off))
      .attr("fill","none").attr("stroke", bd.color).attr("stroke-width", bd.w)
      .attr("stroke-linecap","butt");
    cursor += bd.w + FLOW_GAP;
  });
}
/* ===================== NIEUW: Consumeren → Weggooien ===================== */

/* Data-loader: gebruik %Weggegooid */
async function loadConsumeToTrashValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const r = rows.find(x => x["Type verpakking"] === type);
    if(!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%Weggegooid"]) || 0) / 100;
    return n * p;
  }
  return { 
    grote:  val("Grote flessen"), 
    kleine: val("Klein flesje"), 
    blik:   val("Blikjes"), 
    glas:   val("Glas") 
  };
}

/* Tekenen: Consumeren → Weggooien */
function drawConsumeToTrash(values){
  const pA = centerInViewBox(".consumeren");
  const pB = centerInViewBox(".weggooien");

  // kleine positionering
  pA.x += 15;   // iets naar rechts van het figuurtje
  pA.y += 25;   // iets omlaag
  pB.x -= 10;   // iets naar links van de prullenbak
  pB.y -= 10;   // iets omhoog

  // trim zodat de lijn niet in iconen boort
  const TRIM_START = 50;  // vanaf consumeren
  const TRIM_END   = 100;  // vóór de prullenbak
  const { a, b } = segTrim(pA, pB, TRIM_START, TRIM_END);

  // schaal & kleuren
  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([4, 20]);
  const bands = [
    {key:"grote",  color:"#000000", w: scaleW(values.grote)},
    {key:"kleine", color:"#1f6f32", w: scaleW(values.kleine)},
    {key:"blik",   color:"#FFD400", w: scaleW(values.blik)},
    {key:"glas",   color:"#A9713A", w: scaleW(values.glas)}
  ];
  const gaps = 2;
  const totalH = bands.reduce((s,x)=>s+x.w,0) + gaps*(bands.length-1);

  // middenlijn schaduw
  flows.append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill","none").attr("stroke","#111").attr("stroke-width",3)
    .attr("opacity",0.25).attr("stroke-linecap","round");

  // banden
  let cursor = -totalH/2;
  bands.forEach(bd => {
    const off = cursor + bd.w/2;
    flows.append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill","none").attr("stroke", bd.color).attr("stroke-width", bd.w)
      .attr("stroke-linecap","butt");
    cursor += bd.w + gaps;
  });
}

/* ===================== NIEUW: Verzamelen → Consumeren ===================== */

/* Data-loader: gebruik %Ingeleverd (het deel dat weer terugkomt bij consument via recycling) */
async function loadCollectToConsumeValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const r = rows.find(x => x["Type verpakking"] === type);
    if(!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%Ingeleverd"]) || 0) / 100; // hergebruikt deel
    return n * p;
  }
  return { 
    grote:  val("Grote flessen"), 
    kleine: val("Klein flesje"), 
    blik:   val("Blikjes"), 
    glas:   val("Glas") 
  };
}

/* Tekenen: Verzamelen → Consumeren */
function drawCollectToConsume(values){
  const pA = centerInViewBox(".verzamelen");
  const pB = centerInViewBox(".consumeren");

  // kleine positionering
  pA.x += 10;   // iets naar rechts van de prullenbak
  pA.y -= 30;   // iets omhoog
  pB.x -= 20;   // iets naar links van de figuur
  pB.y += 10;   // iets omlaag

  // trim zodat de lijn niet door iconen loopt
  const TRIM_START = 120;  // vanaf verzamelen
  const TRIM_END   = 160;  // vóór consumeren stoppen (verhoog voor korter)
  const { a, b } = segTrim(pA, pB, TRIM_START, TRIM_END);

  // schaal & kleuren
  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([4, 20]);
  const bands = [
    {key:"grote",  color:"#000000", w: scaleW(values.grote)},
    {key:"kleine", color:"#1f6f32", w: scaleW(values.kleine)},
    {key:"blik",   color:"#FFD400", w: scaleW(values.blik)},
    {key:"glas",   color:"#A9713A", w: scaleW(values.glas)}
  ];
  const gaps = 2;
  const totalH = bands.reduce((s,x)=>s+x.w,0) + gaps*(bands.length-1);

  // middenlijn schaduw
  flows.append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill","none").attr("stroke","#111").attr("stroke-width",3)
    .attr("opacity",0.25).attr("stroke-linecap","round");

  // banden
  let cursor = -totalH/2;
  bands.forEach(bd => {
    const off = cursor + bd.w/2;
    flows.append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill","none").attr("stroke", bd.color).attr("stroke-width", bd.w)
      .attr("stroke-linecap","butt");
    cursor += bd.w + gaps;
  });
}

/* ===================== NIEUW: Verzamelen → Doneren (Inleveren) ===================== */

/* Data-loader: gebruikt %Gedoneerd als aanwezig, anders %Ingeleverd */
async function loadCollectToDonateValues(){
  const rows = await d3.csv("data.csv");
  function val(type){
    const r = rows.find(x => x["Type verpakking"] === type);
    if(!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const perc = (r["%Gedoneerd"] && r["%Gedoneerd"].trim() !== "")
      ? r["%Gedoneerd"]
      : r["%Ingeleverd"];
    const p = (parseFloat(String(perc).replace('%','').replace(',','.')) || 0) / 100;
    return n * p;
  }
  return {
    grote:  val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik:   val("Blikjes"),
    glas:   val("Glas")
  };
}

/* Tekenen: Verzamelen → Doneren */
function drawCollectToDonate(values){
  const pA = centerInViewBox(".verzamelen");
  const pB = centerInViewBox(".inleveren");

  // lichte positionering zodat we niet door iconen lopen
  pA.x += 10;   // iets rechts van 'Verzamelen'
  pA.y -= 10;   // iets omhoog
  pB.x -= 20;   // iets links van 'Inleveren/Doneren'
  pB.y += 6;    // iets omlaag

  // inkorten aan beide kanten
  const TRIM_START = 35;  // vanaf Verzamelen
  const TRIM_END   = 110;  // vóór Doneren stoppen
  const { a, b } = segTrim(pA, pB, TRIM_START, TRIM_END);

  // schaal & kleuren (consistent met andere nieuwe lijnen)
  const maxVal = Math.max(values.grote, values.kleine, values.blik, values.glas, 1);
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([4, 20]);
  const bands = [
    {key:"grote",  color:"#000000", w: scaleW(values.grote)},
    {key:"kleine", color:"#1f6f32", w: scaleW(values.kleine)},
    {key:"blik",   color:"#FFD400", w: scaleW(values.blik)},
    {key:"glas",   color:"#A9713A", w: scaleW(values.glas)}
  ];
  const gaps = 2;
  const totalH = bands.reduce((s,x)=>s+x.w,0) + gaps*(bands.length-1);

  // middenlijn schaduw
  flows.append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill","none").attr("stroke","#111").attr("stroke-width",3)
    .attr("opacity",0.25).attr("stroke-linecap","round");

  // vier banden met gelijke eindcaps
  let cursor = -totalH/2;
  bands.forEach(bd => {
    const off = cursor + bd.w/2;
    flows.append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill","none").attr("stroke", bd.color).attr("stroke-width", bd.w)
      .attr("stroke-linecap","butt");
    cursor += bd.w + gaps;
  });
}

/* Aanroepen bij load/resize */
window.addEventListener("load", async () => {
  const z2d = await loadCollectToDonateValues();
  drawCollectToDonate(z2d);
});
window.addEventListener("resize", async () => {
  const z2d = await loadCollectToDonateValues();
  drawCollectToDonate(z2d);
});


/* Extra aanroepen */
window.addEventListener("load", async () => {
  const v2c = await loadCollectToConsumeValues();
  drawCollectToConsume(v2c);
});
window.addEventListener("resize", async () => {
  const v2c = await loadCollectToConsumeValues();
  drawCollectToConsume(v2c);
});


/* Extra aanroepen */
window.addEventListener("load", async () => {
  const c2t = await loadConsumeToTrashValues();
  drawConsumeToTrash(c2t);
});
window.addEventListener("resize", async () => {
  const c2t = await loadConsumeToTrashValues();
  drawConsumeToTrash(c2t);
});



/* Extra aanroepen zonder bestaande initTop te wijzigen */
window.addEventListener("load", async () => {
  const f2c = await loadFridgeToConsumeValues();
  drawFridgeToConsume(f2c);
  const c2f = await loadConsumeToFridgeValues();
  drawConsumeToFridge(c2f);
});
window.addEventListener("resize", async () => {
  // initTop wist flows al; onze calls tekenen daarna de extra twee banen opnieuw
  const f2c = await loadFridgeToConsumeValues();
  drawFridgeToConsume(f2c);
  const c2f = await loadConsumeToFridgeValues();
  drawConsumeToFridge(c2f);
});
