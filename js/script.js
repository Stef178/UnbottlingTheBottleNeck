document.addEventListener("DOMContentLoaded", () => {
  const fridge = d3.select("#fridge-image");
  const overlay = d3.select("#fridge-overlay");
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
    if (!clickedInside) {
      overlay.classed("active", false).html("");
    }
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
    Glas: { file: "glas", shelf: "middleTop" },
    Blikjes: { file: "blikje", shelf: "middleBottom" },
    "Grote flessen": { file: "grotefles", shelf: "bottom" },
  };
  Object.values(shelves).forEach((s) => s.html(""));
  data.forEach((row) => {
    const type = row["Type verpakking"];
    const info = typeMap[type];
    if (!info) return;
    const percentStr = row["%Opgeborgen"]
      .replace("%", "")
      .replace(",", ".")
      .trim();
    const percent = parseFloat(percentStr) || 0;
    const count = Math.max(1, Math.round((percent / 100) * 10));
    const shelf = shelves[info.shelf];
    for (let i = 0; i < count; i++) {
      const img = shelf
        .append("img")
        .attr("src", `assets/icons/${info.file}.svg`)
        .attr("alt", type)
        .attr("class", "item");
      setTimeout(() => img.classed("visible", true), i * 70);
    }
  });
}
