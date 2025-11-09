const flows = d3.select("#flows");
const W = 1200,
  H = 600;

function centerInViewBox(sel) {
  const el = document.querySelector(sel);
  const box = document.querySelector(".visual").getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    x: ((r.left - box.left + r.width / 2) / box.width) * W,
    y: ((r.top - box.top + r.height / 2) / box.height) * H,
  };
}
function pFloat(s) {
  return parseFloat(String(s).replace("%", "").replace(",", "."));
}

let CSV_ROWS = [];
const KEY2LABEL = {
  grote: "Grote flessen",
  kleine: "Klein flesje",
  blik: "Blikjes",
  glas: "Glas",
};
function pctFor(typeLabel, col, fallbackCol) {
  const r = CSV_ROWS.find((x) => x["Type verpakking"] === typeLabel);
  if (!r) return 0;
  const raw =
    r[col] && String(r[col]).trim() !== ""
      ? r[col]
      : fallbackCol
      ? r[fallbackCol]
      : 0;
  return parseFloat(String(raw).replace("%", "").replace(",", ".")) || 0;
}

const tooltip = d3.select("#tooltip");
function showTip(text, x, y) {
  tooltip
    .text(text)
    .style("opacity", 1)
    .style("transform", `translate(${x + 12}px, ${y + 12}px)`)
    .attr("aria-hidden", "false");
}
function hideTip() {
  tooltip
    .style("opacity", 0)
    .attr("aria-hidden", "true")
    .style("transform", "translate(-9999px, -9999px)");
}
function wireHover(sel) {
  sel
    .classed("flow-band", true)
    .on("mouseenter", function (event) {
      const el = d3.select(this);
      const label = el.attr("data-label");
      const metric = el.attr("data-metric");
      const val = parseFloat(el.attr("data-pct")) || 0;
      showTip(
        `${label}: ${val.toFixed(1)}% (${metric.replace("%", "")})`,
        event.clientX,
        event.clientY
      );
    })
    .on("mousemove", function (event) {
      showTip(tooltip.text(), event.clientX, event.clientY);
    })
    .on("mouseleave", hideTip);
}

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
        if (!CSV_ROWS.length) CSV_ROWS = await d3.csv("data.csv");
        fillFridge(CSV_ROWS);
      } catch (err) {
        console.error("Fout bij laden CSV:", err);
      }
    }
  });

  overlay.on("click", (event) => {
    const clickedInside = event.target.closest("#open-fridge");
    if (!clickedInside) overlay.classed("active", false).html("");
  });

  trashBtn.on("click", async () => {
    const isActive = trashOverlay.classed("active");
    if (!isActive) {
      trashOverlay.classed("active", true);
      trashOverlay.html(`
        <div class="trash-content">
          <div class="trash-visual">
            <img src="assets/icons/backgroundtrash.svg" alt="Prullenbak open" id="open-trash" />
            <div class="trash-stacks" id="trash-stacks"></div>
          </div>
        </div>
      `);
      try {
        if (!CSV_ROWS.length) CSV_ROWS = await d3.csv("data.csv");
        fillTrash(CSV_ROWS);
      } catch (err) {
        console.error("Fout bij laden CSV:", err);
      }
    }
  });

  trashOverlay.on("click", (event) => {
    const clickedInside = event.target.closest("#open-trash");
    if (!clickedInside) trashOverlay.classed("active", false).html("");
  });

  let CSV_ROWS = [];
  const returnBtn = d3.select(".step.inleveren");
  const returnOverlay = d3.select("#return-overlay");

  returnBtn.on("click", async () => {
    const isActive = returnOverlay.classed("active");
    if (!isActive) {
      returnOverlay.classed("active", true);

      returnOverlay.html(`
      <div class="return-content">
        <div class="return-visual">
          <img
            src="assets/icons/inleverendonerenbackground.svg"
            alt="Inleveren/Doneren achtergrond"
            id="return-bg"
          />
          <div id="return-stacks"></div>
        </div>
      </div>
    `);

      try {
        if (!CSV_ROWS.length) CSV_ROWS = await d3.csv("data.csv");
        fillReturn(CSV_ROWS);
      } catch (err) {
        console.error("Fout bij laden CSV:", err);
      }
    }
  });

  returnOverlay.on("click", (event) => {
    const clickedInside = event.target.closest("#return-bg");
    if (!clickedInside) returnOverlay.classed("active", false).html("");
  });
});

const consumerenImg = d3.select("#consumeren img");

consumerenImg
  .on("mouseenter", (event) => {
    let content = `
      <strong style="font-size:14px; display:block; margin-bottom:6px;">
        Totaal geconsumeerd per verpakkingssoort
      </strong>
    `;

    const typeColors = {
      "Klein flesje": "#1f6f32",
      Glas: "#a9713a",
      Blikjes: "#ffd400",
      "Grote flessen": "#000000",
    };

    CSV_ROWS.forEach((d) => {
      const type = d["Type verpakking"];
      const consumed = d["Geconsumeerd"];
      const color = typeColors[type] || null;

      if (!color) return;

      content += `
        <span style="display:flex; align-items:center; gap:4px;">
          <span style="width:12px; height:12px; background:${color}; border-radius:50%; display:inline-block;"></span>
          ${type}: ${consumed} stuks
        </span><br>`;
    });

    const x = event.clientX;
    const y = event.clientY;

    d3.select("#tooltip")
      .html(content)
      .style("opacity", 1)
      .style("transform", `translate(${x + 12}px, ${y + 12}px)`)
      .attr("aria-hidden", "false");
  })
  .on("mousemove", (event) => {
    const x = event.clientX;
    const y = event.clientY;

    d3.select("#tooltip").style(
      "transform",
      `translate(${x + 12}px, ${y + 12}px)`
    );
  })
  .on("mouseleave", () => {
    d3.select("#tooltip").style("opacity", 0).attr("aria-hidden", "true");
  });

const kopenImg = d3.select(".step.kopen img");

kopenImg
  .on("mouseenter", function (event) {
    let content =
      '<strong style="font-size:14px; display:block; margin-bottom:8px;">' +
      "Totaal gekocht per verpakkingssoort" +
      "</strong>";

    const typeColors = {
      "Klein flesje": "#1f6f32",
      Blikjes: "#ffd400",
      "Grote flessen": "#000000",
      Glas: "#a9713a",
    };

    CSV_ROWS.forEach((d) => {
      const type = d["Type verpakking"];
      const bought = d["Gekocht"];
      const color = typeColors[type] || null;

      if (!color) return;

      content += `
        <span style="display:flex; align-items:center; gap:4px;">
          <span style="width:12px; height:12px; background:${color}; border-radius:50%; display:inline-block;"></span>
          ${type}: ${bought} stuks
        </span><br>`;
    });

    const x = event.clientX;
    const y = event.clientY;

    d3.select("#tooltip")
      .html(content)
      .style("opacity", 1)
      .style("transform", `translate(${x + 12}px, ${y + 12}px)`)
      .attr("aria-hidden", "false");
  })
  .on("mousemove", (event) => {
    const x = event.clientX;
    const y = event.clientY;

    d3.select("#tooltip").style(
      "transform",
      `translate(${x + 12}px, ${y + 12}px)`
    );
  })
  .on("mouseleave", () => {
    d3.select("#tooltip").style("opacity", 0).attr("aria-hidden", "true");
  });

const verzamelenImg = d3.select(".step.verzamelen img");

verzamelenImg
  .on("mouseenter", function (event) {
    let content =
      '<strong style="font-size:14px; display:block; margin-bottom:8px;">' +
      "Totaal verzameld per verpakkingssoort" +
      "</strong>";

    const typeColors = {
      "Klein flesje": "#1f6f32",
      Blikjes: "#ffd400",
      "Grote flessen": "#000000",
      Glas: "#a9713a",
    };

    CSV_ROWS.forEach((d) => {
      const type = d["Type verpakking"];
      const collected = d["Verzameld"];
      const color = typeColors[type] || null;

      if (!color) return;

      content += `
        <span style="display:flex; align-items:center; gap:4px;">
          <span style="width:12px; height:12px; background:${color}; border-radius:50%; display:inline-block;"></span>
          ${type}: ${collected} stuks
        </span><br>`;
    });

    const x = event.clientX;
    const y = event.clientY;

    d3.select("#tooltip")
      .html(content)
      .style("opacity", 1)
      .style("transform", `translate(${x + 12}px, ${y + 12}px)`)
      .attr("aria-hidden", "false");
  })
  .on("mousemove", (event) => {
    const x = event.clientX;
    const y = event.clientY;

    d3.select("#tooltip").style(
      "transform",
      `translate(${x + 12}px, ${y + 12}px)`
    );
  })
  .on("mouseleave", () => {
    d3.select("#tooltip").style("opacity", 0).attr("aria-hidden", "true");
  });

function fillFridge(data) {
  const shelves = {
    top: d3.select("#shelf-top"),
    middleTop: d3.select("#shelf-middle-top"),
    middleBottom: d3.select("#shelf-middle-bottom"),
    bottom: d3.select("#shelf-bottom"),
  };

  const typeMap = {
    "Klein flesje": {
      file: "kleinflesje",
      shelf: "top",
      label: "Kleine flesjes",
    },
    Glas: { file: "glas", shelf: "middleTop", label: "Glas" },
    Blikjes: { file: "blikje", shelf: "middleBottom", label: "Blikjes" },
    "Grote flessen": {
      file: "grotefles",
      shelf: "bottom",
      label: "Grote flessen",
    },
  };

  const overlay = d3.select("#fridge-overlay");
  if (overlay.selectAll(".fridge-title").empty()) {
    overlay
      .append("div")
      .attr("class", "fridge-title")
      .html("Wat word er het<br>meest opgeborgen?");
  }

  Object.values(shelves).forEach((s) => s.html(""));
  d3.selectAll(".shelf-label").remove();

  data.forEach((row) => {
    const type = row["Type verpakking"];
    const info = typeMap[type];
    if (!info) return;

    const shelf = shelves[info.shelf];

    const percentStr = String(row["%Opgeborgen"])
      .replace("%", "")
      .replace(",", ".")
      .trim();
    const percent = parseFloat(percentStr) || 0;

    const count = Math.max(1, Math.round((percent / 100) * 10));

    const actualCount = parseInt(row["Opgeborgen"]) || 0;

    for (let i = 0; i < count; i++) {
      const img = shelf
        .append("img")
        .attr("src", `assets/icons/${info.file}.svg`)
        .attr("alt", type)
        .attr("class", "item");
      setTimeout(() => img.classed("visible", true), i * 70);
    }

    d3.select(".fridge-shelves")
      .append("div")
      .attr("class", `shelf-label shelf-label-${info.shelf}`)
      .html(`${info.label}: ${percent.toFixed(1)}% (${actualCount} stuks)`);
  });
}

function fillTrash(data) {
  const overlay = d3.select("#trash-overlay");
  const container = d3.select("#trash-stacks");

  container.html("");

  if (overlay.selectAll(".trash-title").empty()) {
    overlay
      .append("div")
      .attr("class", "trash-title")
      .text(
        "Hoeveel word er in verhouding weggegooid en\nhoeveel is het statiegeld waard per product?"
      );
  }

  const typeMap = {
    "Grote flessen": { file: "grotefles", statiegeld: "€0,25" },
    "Klein flesje": { file: "kleinflesje", statiegeld: "€0,15" },
    Blikjes: { file: "blikje", statiegeld: "€0,15" },
    Glas: { file: "glas", statiegeld: "€0,10" },
  };

  data.forEach((row) => {
    const type = row["Type verpakking"];
    const info = typeMap[type];
    if (!info) return;

    const percentStr = String(row["%Weggegooid"])
      .replace("%", "")
      .replace(",", ".")
      .trim();
    const percent = parseFloat(percentStr) || 0;
    const heightCount = Math.round((percent / 100) * 10);

    const actualCount = parseInt(row["Weggegooid"]) || 0;

    const col = container.append("div").attr("class", "trash-column");

    col
      .append("div")
      .attr("class", "trash-label")
      .html(`${percent}% ${type}<br>(${actualCount} stuks)`);

    for (let i = 0; i < heightCount; i++) {
      const img = col
        .append("img")
        .attr("src", `assets/icons/${info.file}.svg`)
        .attr("alt", type);
      setTimeout(() => img.classed("visible", true), i * 80);
    }

    col.append("div").attr("class", "trash-money").text(info.statiegeld);
  });
}

function fillReturn(data) {
  const container = d3.select("#return-stacks");
  container.html("");

  const typeMap = {
    "Grote flessen": { file: "grotefles" },
    "Klein flesje": { file: "kleinflesje" },
    Blikjes: { file: "blikje" },
    Glas: { file: "glas" },
  };

  data.forEach((row) => {
    const type = row["Type verpakking"];
    const info = typeMap[type];
    if (!info) return;

    const inCount = parseInt(row["Ingeleverd"]) || 0;
    const donCount = parseInt(row["Gedoneerd"]) || 0;

    const inPercent =
      parseFloat(
        String(row["%Ingeleverd"]).replace("%", "").replace(",", ".").trim()
      ) || 0;
    const donPercent =
      parseFloat(
        String(row["%Gedoneerd"]).replace("%", "").replace(",", ".").trim()
      ) || 0;

    const inHeight = Math.round((inPercent / 100) * 10);
    const donHeight = Math.round((donPercent / 100) * 10);

    const col = container.append("div").attr("class", "return-column");

    const towerWrapper = col.append("div").attr("class", "tower-wrapper");

    const inCol = towerWrapper.append("div").attr("class", "tower inleveren");
    inCol
      .append("div")
      .attr("class", "return-label ingeleverd")
      .html(`Ingeleverd:<br>${inPercent}%<br>(${inCount} stuks)`);
    for (let i = 0; i < inHeight; i++) {
      const img = inCol
        .append("img")
        .attr("src", `assets/icons/${info.file}.svg`)
        .attr("alt", `${type} ingeleverd`);
      setTimeout(() => img.classed("visible", true), i * 80);
    }

    const donCol = towerWrapper.append("div").attr("class", "tower doneren");
    donCol
      .append("div")
      .attr("class", "return-label gedoneerd")
      .html(`Gedoneerd:<br>${donPercent}%<br>(${donCount} stuks)`);
    for (let i = 0; i < donHeight; i++) {
      const img = donCol
        .append("img")
        .attr("src", `assets/icons/${info.file}.svg`)
        .attr("alt", `${type} gedoneerd`);
      setTimeout(() => img.classed("visible", true), i * 80);
    }
  });

  const bottomLabels = container.append("div").attr("class", "bottom-labels");
  bottomLabels
    .append("div")
    .html("Totale<br>statiegeld waarde:<br>€2,85")
    .attr("class", "bottom-label");
  bottomLabels
    .append("div")
    .html("Totale<br>statiegeld waarde:<br>€1,80")
    .attr("class", "bottom-label");
  bottomLabels
    .append("div")
    .html("Totale<br>statiegeld waarde:<br>€2,00")
    .attr("class", "bottom-label");
  bottomLabels
    .append("div")
    .html("Totale<br>statiegeld waarde:<br>€0,40")
    .attr("class", "bottom-label");
}
async function loadTopValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const row = rows.find((r) => r["Type verpakking"] === type);
    if (!row) return 0;
    const n = +row["Unieke verpakkingen"] || 0;
    const pi = (pFloat(row["%Ingeleverd"]) || 0) / 100;
    return n * pi;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}

function drawTopBands(values) {
  const p1 = centerInViewBox(".consumeren");
  const p2 = centerInViewBox(".inleveren");

  const padStart = 60;
  const padEnd = 120;
  const yOffset = -10;

  const xLeft = Math.min(p1.x, p2.x) + padStart;
  const xRight = Math.max(p1.x, p2.x) - padEnd;
  const y = (p1.y + p2.y) / 2 + yOffset;

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const w = d3.scaleLinear().domain([0, maxVal]).range([4, 26]);

  const bands = [
    { key: "grote", color: "#000000", metric: "%Ingeleverd" },
    { key: "kleine", color: "#1f6f32", metric: "%Ingeleverd" },
    { key: "blik", color: "#FFD400", metric: "%Ingeleverd" },
    { key: "glas", color: "#A9713A", metric: "%Ingeleverd" },
  ];

  const gaps = 0;
  const heights = bands.map((b) => w(values[b.key]));
  const totalH = heights.reduce((a, b) => a + b, 0) + gaps * (bands.length - 1);
  let yCursor = y - totalH / 2;

  flows
    .append("line")
    .attr("x1", xLeft)
    .attr("y1", y)
    .attr("x2", xRight)
    .attr("y2", y)
    .attr("stroke", "#111")
    .attr("stroke-width", 4)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "butt");

  bands.forEach((b, i) => {
    const h = heights[i];
    const yBand = yCursor + h / 2;
    const path = flows
      .append("line")
      .attr("x1", xLeft)
      .attr("y1", yBand)
      .attr("x2", xRight)
      .attr("y2", yBand)
      .attr("stroke", b.color)
      .attr("stroke-width", h)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[b.key])
      .attr("data-metric", b.metric)
      .attr("data-pct", pctFor(KEY2LABEL[b.key], b.metric));
    wireHover(path);
    path.classed("flow-band", true);
    yCursor += h + gaps;
  });
}

function trimSegment(a, b, trimStartPx, trimEndPx) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len,
    uy = dy / len;
  return {
    a: { x: a.x + ux * trimStartPx, y: a.y + uy * trimStartPx },
    b: { x: b.x - ux * trimEndPx, y: b.y - uy * trimEndPx },
  };
}
function pathWithOffset(a, b, offset) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len,
    ny = dx / len;
  const sx = nx * offset,
    sy = ny * offset;
  return `M${a.x + sx},${a.y + sy} L${b.x + sx},${b.y + sy}`;
}

async function loadBuyValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const row = rows.find((r) => r["Type verpakking"] === type);
    if (!row) return 0;
    const n = +row["Unieke verpakkingen"] || 0;
    const pi = (pFloat(row["%Weggegooid"]) || 0) / 100;
    return n * pi;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}

function drawBuyLine(values) {
  const p1 = centerInViewBox(".kopen");
  const p2 = centerInViewBox(".consumeren");

  const TRIM_END = 50;
  const { a, b } = trimSegment(p1, p2, 0, TRIM_END);

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const w = d3.scaleLinear().domain([0, maxVal]).range([4, 26]);

  const bands = [
    { key: "grote", color: "#000000", metric: "%Weggegooid" },
    { key: "kleine", color: "#1f6f32", metric: "%Weggegooid" },
    { key: "blik", color: "#FFD400", metric: "%Weggegooid" },
    { key: "glas", color: "#A9713A", metric: "%Weggegooid" },
  ];

  const gaps = 0;
  const heights = bands.map((bd) => w(values[bd.key]));
  const totalH = heights.reduce((x, y) => x + y, 0) + gaps * (bands.length - 1);

  flows
    .append("path")
    .attr("d", pathWithOffset(a, b, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 4)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  let cursor = -totalH / 2;
  bands.forEach((bd, i) => {
    const h = heights[i];
    const offset = cursor + h / 2;
    const path = flows
      .append("path")
      .attr("d", pathWithOffset(a, b, offset))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", h)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[bd.key])
      .attr("data-metric", bd.metric)
      .attr("data-pct", pctFor(KEY2LABEL[bd.key], bd.metric));
    wireHover(path);
    cursor += h + gaps;
  });
}

async function loadStoreValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const row = rows.find((r) => r["Type verpakking"] === type);
    if (!row) return 0;
    const n = +row["Unieke verpakkingen"] || 0;
    const p = (pFloat(row["%Opgeborgen"]) || 0) / 100;
    return n * p;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}

function drawStoreLine(values) {
  const p1 = centerInViewBox(".kopen");
  const p2 = centerInViewBox(".opbergen");

  p1.x += 40;
  p1.y -= -10;
  p2.x += 50;
  p2.y += 10;

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const w = d3.scaleLinear().domain([0, maxVal]).range([4, 26]);

  const bands = [
    { key: "grote", color: "#000000", metric: "%Opgeborgen" },
    { key: "kleine", color: "#1f6f32", metric: "%Opgeborgen" },
    { key: "blik", color: "#FFD400", metric: "%Opgeborgen" },
    { key: "glas", color: "#A9713A", metric: "%Opgeborgen" },
  ];

  const totalH = bands.reduce((s, bd) => s + w(values[bd.key]), 0);

  flows
    .append("path")
    .attr("d", pathWithOffset(p1, p2, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 4)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  let cursor = 0;
  bands.forEach((bd) => {
    const bw = w(values[bd.key]);
    const offset = cursor + bw / 2;
    const path = flows
      .append("path")
      .attr("d", pathWithOffset(p1, p2, offset))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", bw)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[bd.key])
      .attr("data-metric", bd.metric)
      .attr("data-pct", pctFor(KEY2LABEL[bd.key], bd.metric));
    wireHover(path);
    cursor += bw;
  });
}

function segTrim(a, b, trimStartPx, trimEndPx) {
  return trimSegment(a, b, trimStartPx, trimEndPx);
}
function offsetPath(a, b, offset) {
  return pathWithOffset(a, b, offset);
}

async function loadFridgeToConsumeValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const r = rows.find((x) => x["Type verpakking"] === type);
    if (!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%UitKoelkast"]) || 0) / 100;
    return n * p;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}
async function loadConsumeToFridgeValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const r = rows.find((x) => x["Type verpakking"] === type);
    if (!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%TerugKoelkast"]) || 0) / 100;
    return n * p;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}
const FLOW_MIN_W = 3;
const FLOW_MAX_W = 18;
const FLOW_GAP = 1.5;
const LANE_SEP = 55;

function drawFridgeToConsume(values) {
  const pA = centerInViewBox(".opbergen");
  const pB = centerInViewBox(".consumeren");

  pA.x += 30;
  pA.y -= -30;
  pB.x += 30;
  pB.y += -40;

  const { a, b } = segTrim(pA, pB, 130, 130);

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const scaleW = d3
    .scaleLinear()
    .domain([0, maxVal])
    .range([FLOW_MIN_W, FLOW_MAX_W]);

  const bands = [
    {
      key: "grote",
      color: "#000000",
      w: scaleW(values.grote),
      metric: "%UitKoelkast",
    },
    {
      key: "kleine",
      color: "#1f6f32",
      w: scaleW(values.kleine),
      metric: "%UitKoelkast",
    },
    {
      key: "blik",
      color: "#FFD400",
      w: scaleW(values.blik),
      metric: "%UitKoelkast",
    },
    {
      key: "glas",
      color: "#A9713A",
      w: scaleW(values.glas),
      metric: "%UitKoelkast",
    },
  ];

  const FLOW_GAP = 0;
  const totalH =
    bands.reduce((s, x) => s + x.w, 0) + FLOW_GAP * (bands.length - 1);

  flows
    .append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 3)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  let cursor = -totalH / 2;
  bands.forEach((bd) => {
    const off = cursor + bd.w / 2;
    const path = flows
      .append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", bd.w)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[bd.key])
      .attr("data-metric", bd.metric)
      .attr("data-pct", pctFor(KEY2LABEL[bd.key], bd.metric));
    wireHover(path);
    cursor += bd.w + FLOW_GAP;
  });
}

function drawConsumeToFridge(values) {
  const pA = centerInViewBox(".consumeren");
  const pB = centerInViewBox(".opbergen");

  pA.x += 35;
  pA.y -= 70;
  pB.x += 35;
  pB.y += 50;

  const trimmed = segTrim(pA, pB, 125, 125);

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const scaleW = d3
    .scaleLinear()
    .domain([0, maxVal])
    .range([FLOW_MIN_W, FLOW_MAX_W]);

  const bands = [
    {
      key: "grote",
      color: "#000000",
      w: scaleW(values.grote),
      metric: "%TerugKoelkast",
    },
    {
      key: "kleine",
      color: "#1f6f32",
      w: scaleW(values.kleine),
      metric: "%TerugKoelkast",
    },
    {
      key: "blik",
      color: "#FFD400",
      w: scaleW(values.blik),
      metric: "%TerugKoelkast",
    },
    {
      key: "glas",
      color: "#A9713A",
      w: scaleW(values.glas),
      metric: "%TerugKoelkast",
    },
  ];

  const FLOW_GAP = 0;
  const totalH =
    bands.reduce((s, x) => s + x.w, 0) + FLOW_GAP * (bands.length - 1);

  function lanePath(a, b, laneOffset, bandOffset) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len,
      ny = dx / len;
    const sx = nx * (laneOffset + bandOffset),
      sy = ny * (laneOffset + bandOffset);
    return `M${a.x + sx},${a.y + sy} L${b.x + sx},${b.y + sy}`;
  }

  flows
    .append("path")
    .attr("d", lanePath(trimmed.a, trimmed.b, LANE_SEP, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 3)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  let cursor = -totalH / 2;
  bands.forEach((bd) => {
    const off = cursor + bd.w / 2;
    const path = flows
      .append("path")
      .attr("d", lanePath(trimmed.a, trimmed.b, LANE_SEP, off))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", bd.w)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[bd.key])
      .attr("data-metric", bd.metric)
      .attr("data-pct", pctFor(KEY2LABEL[bd.key], bd.metric));
    wireHover(path);
    cursor += bd.w + FLOW_GAP;
  });
}

async function loadConsumeToTrashValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const r = rows.find((x) => x["Type verpakking"] === type);
    if (!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%Weggegooid"]) || 0) / 100;
    return n * p;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}
function drawConsumeToTrash(values) {
  const pA = centerInViewBox(".consumeren");
  const pB = centerInViewBox(".weggooien");

  pA.x += 20;
  pA.y += 25;
  pB.x -= 10;
  pB.y -= 10;

  const { a, b } = segTrim(pA, pB, 50, 100);

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([4, 20]);
  const bands = [
    {
      key: "grote",
      color: "#000000",
      w: scaleW(values.grote),
      metric: "%Weggegooid",
    },
    {
      key: "kleine",
      color: "#1f6f32",
      w: scaleW(values.kleine),
      metric: "%Weggegooid",
    },
    {
      key: "blik",
      color: "#FFD400",
      w: scaleW(values.blik),
      metric: "%Weggegooid",
    },
    {
      key: "glas",
      color: "#A9713A",
      w: scaleW(values.glas),
      metric: "%Weggegooid",
    },
  ];
  const gaps = 0;
  const totalH = bands.reduce((s, x) => s + x.w, 0) + gaps * (bands.length - 1);

  flows
    .append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 3)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  let cursor = -totalH / 2;
  bands.forEach((bd) => {
    const off = cursor + bd.w / 2;
    const path = flows
      .append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", bd.w)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[bd.key])
      .attr("data-metric", bd.metric)
      .attr("data-pct", pctFor(KEY2LABEL[bd.key], bd.metric));
    wireHover(path);
    cursor += bd.w + gaps;
  });
}

async function loadCollectToConsumeValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const r = rows.find((x) => x["Type verpakking"] === type);
    if (!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const p = (pFloat(r["%Ingeleverd"]) || 0) / 100;
    return n * p;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}
function drawCollectToConsume(values) {
  const pA = centerInViewBox(".verzamelen");
  const pB = centerInViewBox(".consumeren");

  pA.x += 10;
  pA.y -= 30;
  pB.x -= 80;
  pB.y += 0;

  const { a, b } = segTrim(pA, pB, 120, 160);

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([4, 20]);
  const bands = [
    {
      key: "grote",
      color: "#000000",
      w: scaleW(values.grote),
      metric: "%Ingeleverd",
    },
    {
      key: "kleine",
      color: "#1f6f32",
      w: scaleW(values.kleine),
      metric: "%Ingeleverd",
    },
    {
      key: "blik",
      color: "#FFD400",
      w: scaleW(values.blik),
      metric: "%Ingeleverd",
    },
    {
      key: "glas",
      color: "#A9713A",
      w: scaleW(values.glas),
      metric: "%Ingeleverd",
    },
  ];
  const gaps = 0;
  const totalH = bands.reduce((s, x) => s + x.w, 0) + gaps * (bands.length - 1);

  flows
    .append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 3)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  let cursor = -totalH / 2;
  bands.forEach((bd) => {
    const off = cursor + bd.w / 2;
    const path = flows
      .append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", bd.w)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[bd.key])
      .attr("data-metric", bd.metric)
      .attr("data-pct", pctFor(KEY2LABEL[bd.key], bd.metric));
    wireHover(path);
    cursor += bd.w + gaps;
  });
}

async function loadCollectToDonateValues() {
  const rows = await d3.csv("data.csv");
  function val(type) {
    const r = rows.find((x) => x["Type verpakking"] === type);
    if (!r) return 0;
    const n = +r["Unieke verpakkingen"] || 0;
    const perc =
      r["%Gedoneerd"] && r["%Gedoneerd"].trim() !== ""
        ? r["%Gedoneerd"]
        : r["%Ingeleverd"];
    const p =
      (parseFloat(String(perc).replace("%", "").replace(",", ".")) || 0) / 100;
    return n * p;
  }
  return {
    grote: val("Grote flessen"),
    kleine: val("Klein flesje"),
    blik: val("Blikjes"),
    glas: val("Glas"),
  };
}
function drawCollectToDonate(values) {
  const pA = centerInViewBox(".verzamelen");
  const pB = centerInViewBox(".inleveren");

  pA.x += 10;
  pA.y -= 30;
  pB.x -= 0;
  pB.y += -13;

  const { a, b } = segTrim(pA, pB, 35, 110);

  const maxVal = Math.max(
    values.grote,
    values.kleine,
    values.blik,
    values.glas,
    1
  );
  const scaleW = d3.scaleLinear().domain([0, maxVal]).range([4, 20]);
  const bands = [
    {
      key: "grote",
      color: "#000000",
      w: scaleW(values.grote),
      metric: "%Gedoneerd",
    },
    {
      key: "kleine",
      color: "#1f6f32",
      w: scaleW(values.kleine),
      metric: "%Gedoneerd",
    },
    {
      key: "blik",
      color: "#FFD400",
      w: scaleW(values.blik),
      metric: "%Gedoneerd",
    },
    {
      key: "glas",
      color: "#A9713A",
      w: scaleW(values.glas),
      metric: "%Gedoneerd",
    },
  ];
  const gaps = 0;
  const totalH = bands.reduce((s, x) => s + x.w, 0) + gaps * (bands.length - 1);

  flows
    .append("path")
    .attr("d", offsetPath(a, b, 0))
    .attr("fill", "none")
    .attr("stroke", "#111")
    .attr("stroke-width", 3)
    .attr("opacity", 0.25)
    .attr("stroke-linecap", "round");

  let cursor = -totalH / 2;
  bands.forEach((bd) => {
    const off = cursor + bd.w / 2;
    const path = flows
      .append("path")
      .attr("d", offsetPath(a, b, off))
      .attr("fill", "none")
      .attr("stroke", bd.color)
      .attr("stroke-width", bd.w)
      .attr("stroke-linecap", "butt")
      .attr("data-label", KEY2LABEL[bd.key])
      .attr("data-metric", bd.metric)
      .attr("data-pct", pctFor(KEY2LABEL[bd.key], bd.metric, "%Ingeleverd"));
    wireHover(path);
    cursor += bd.w + gaps;
  });
}

async function drawAll() {
  flows.selectAll("*").remove();

  const [
    topValues,
    buyValues,
    storeValues,
    f2cVals,
    c2fVals,
    c2tVals,
    v2cVals,
    z2dVals,
  ] = await Promise.all([
    loadTopValues(),
    loadBuyValues(),
    loadStoreValues(),
    loadFridgeToConsumeValues(),
    loadConsumeToFridgeValues(),
    loadConsumeToTrashValues(),
    loadCollectToConsumeValues(),
    loadCollectToDonateValues(),
  ]);

  drawTopBands(topValues);
  drawBuyLine(buyValues);
  drawStoreLine(storeValues);
  drawFridgeToConsume(f2cVals);
  drawConsumeToFridge(c2fVals);
  drawConsumeToTrash(c2tVals);
  drawCollectToConsume(v2cVals);
  drawCollectToDonate(z2dVals);
}

window.addEventListener("load", async () => {
  if (!CSV_ROWS.length) {
    CSV_ROWS = await d3.csv("data.csv");
  }
  await drawAll();
});
window.addEventListener("resize", drawAll);
