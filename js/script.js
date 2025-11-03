document.addEventListener("DOMContentLoaded", () => {
  const fridge = d3.select("#fridge-image");
  const overlay = d3.select("#fridge-overlay");
  const trash = d3.select(".step.weggooien img");
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
        console.error("❌ Fout bij laden CSV:", err);
      }
    }
  });

  overlay.on("click", (event) => {
    const clickedInside = event.target.closest("#open-fridge");
    if (!clickedInside) overlay.classed("active", false).html("");
  });

  trash.on("click", async () => {
    const isActive = trashOverlay.classed("active");
    if (!isActive) {
      trashOverlay.classed("active", true);
      trashOverlay.html(`
  <div class="trash-content">
    <div class="trash-info">
      <p>💰 Statiegeld per product:</p>
    </div>
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
        console.error("❌ Fout bij laden CSV:", err);
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
    Boven: d3.select("#shelf-top"),
    "Midden-boven": d3.select("#shelf-middle-top"),
    "Midden-onder": d3.select("#shelf-middle-bottom"),
    Onder: d3.select("#shelf-bottom"),
  };

  data.forEach((row) => {
    const shelfName = row["Plek in koelkast"];
    const shelf = shelves[shelfName];
    if (!shelf) return;

    const verpakking = row["Type verpakking"];
    const percentStr = row["%Geconsumeerd"]
      .replace("%", "")
      .replace(",", ".")
      .trim();
    const percent = parseFloat(percentStr) || 0;
    const count = Math.round((percent / 100) * 10);

    const icons = {
      "Grote flessen": "grotefles.svg",
      "Klein flesje": "kleinflesje.svg",
      Blikjes: "blikje.svg",
      Glas: "glas.svg",
    };

    const icon = icons[verpakking];
    if (!icon) return;

    for (let i = 0; i < count; i++) {
      const img = shelf
        .append("img")
        .attr("src", `assets/icons/${icon}`)
        .attr("alt", verpakking)
        .style("opacity", 0)
        .style("transform", "translateY(10px)");

      setTimeout(() => {
        img
          .transition()
          .duration(300)
          .style("opacity", 1)
          .style("transform", "translateY(0)");
      }, i * 100);
    }
  });
}

function fillTrash(data) {
  const container = d3.select("#trash-stacks");
  container.html("");

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

    const percentStr = row["%Weggegooid"]
      .replace("%", "")
      .replace(",", ".")
      .trim();
    const percent = parseFloat(percentStr) || 0;
    const heightCount = Math.round((percent / 100) * 10);

    const col = container.append("div").attr("class", "trash-column");
    col.append("div").attr("class", "trash-label").text(`${percent}% ${type}`);

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
