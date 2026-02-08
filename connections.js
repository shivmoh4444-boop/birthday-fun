function qs(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeWord(w) {
  return w.trim().toUpperCase();
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

async function loadPuzzle() {
  const puzzleId = qs("p") || "demo";
  const res = await fetch(`data/connections-${encodeURIComponent(puzzleId)}.json`);
  if (!res.ok) throw new Error(`Puzzle not found: ${puzzleId}`);
  const data = await res.json();

  // Expecting groups array; allow optional "difficulty" per group (0-3)
  const groups = data.groups.map((g, idx) => ({
    name: g.name,
    words: g.words.map(normalizeWord),
    difficulty: Number.isInteger(g.difficulty) ? g.difficulty : idx // default: order-based
  }));

  const allWords = groups.flatMap(g => g.words);
  if (allWords.length !== 16) throw new Error("Connections puzzle must have exactly 16 words.");
  const unique = new Set(allWords);
  if (unique.size !== 16) throw new Error("Words must be unique (no duplicates).");

  return { puzzleId, groups, allWords };
}

function initConnections({ puzzleId, groups, allWords }) {
  const gridEl = document.getElementById("grid");
  const solvedEl = document.getElementById("solved");
  const statusEl = document.getElementById("status");
  const popupEl = document.getElementById("popup");

  const submitBtn = document.getElementById("submitBtn");
  const deselectBtn = document.getElementById("deselectBtn");
  const shuffleBtn = document.getElementById("shuffleBtn");
  const resetBtn = document.getElementById("resetBtn");

  let mistakes = 0;
  const maxMistakes = 4;
  let selected = [];
  let locked = new Set();
  let solvedGroups = [];

  let order = shuffle([...allWords]);

  let popupTimer = null;
  function showPopup(text) {
    if (!popupEl) return;
    popupEl.textContent = text;
    popupEl.classList.remove("hidden");
    clearTimeout(popupTimer);
    popupTimer = setTimeout(() => popupEl.classList.add("hidden"), 1100);
  }

  function setStatus(msg) {
    statusEl.textContent = `Puzzle: ${puzzleId} • Mistakes: ${mistakes}/${maxMistakes} • ${msg}`;
  }

  function renderSolved() {
    solvedEl.innerHTML = "";
    // show in solve order; difficulty color-coded
    for (const g of solvedGroups) {
      const div = document.createElement("div");
      div.className = `solvedGroup diff${Math.max(0, Math.min(3, g.difficulty))}`;
      div.innerHTML = `
        <div class="solvedTitle">${g.name}</div>
        <div class="solvedWords">${g.words.join(" • ")}</div>
      `;
      solvedEl.appendChild(div);
    }
  }

  function renderGrid() {
    gridEl.innerHTML = "";
    for (const w of order) {
      if (locked.has(w)) continue;

      const tile = document.createElement("div");
      tile.className = "tile" + (selected.includes(w) ? " selected" : "");
      tile.textContent = w;

      tile.addEventListener("click", () => {
        if (locked.has(w)) return;

        if (selected.includes(w)) {
          selected = selected.filter(x => x !== w);
        } else {
          if (selected.length >= 4) return;
          selected = [...selected, w];
          tile.classList.add("bounce");
          setTimeout(() => tile.classList.remove("bounce"), 170);
        }
        renderGrid();
      });

      gridEl.appendChild(tile);
    }
  }

  function resetSelection() {
    selected = [];
    renderGrid();
  }

  function shakeGrid() {
    gridEl.classList.add("gridShake");
    setTimeout(() => gridEl.classList.remove("gridShake"), 320);
  }

  function submit() {
    if (mistakes >= maxMistakes) {
      setStatus("Out of mistakes. Reset to try again.");
      return;
    }

    if (selected.length !== 4) {
      showPopup("Select 4");
      setStatus("Select exactly 4 words.");
      shakeGrid();
      return;
    }

    const found = groups.find(g =>
      !solvedGroups.some(sg => sg.name === g.name) && sameSet(selected, g.words)
    );

    if (found) {
      for (const w of found.words) locked.add(w);
      solvedGroups = [...solvedGroups, found];
      resetSelection();
      renderSolved();

      showPopup("Correct!");
      if (solvedGroups.length === 4) {
        setStatus("You solved all groups! 🎉");
      } else {
        setStatus(`Correct: ${found.name}`);
      }
      return;
    }

    // One-away check (3/4 overlap with any unsolved group)
    let oneAway = false;
    for (const g of groups) {
      if (solvedGroups.some(sg => sg.name === g.name)) continue;
      const overlap = selected.filter(w => g.words.includes(w)).length;
      if (overlap === 3) { oneAway = true; break; }
    }

    mistakes++;
    shakeGrid();
    showPopup(oneAway ? "One away…" : "Nope");

    if (mistakes >= maxMistakes) {
      setStatus("Out of mistakes. Reset to try again.");
    } else {
      setStatus(oneAway ? "One away…" : "Not a group. Try again.");
    }
  }

  function doShuffle() {
    order = shuffle(order);
    renderGrid();
    showPopup("Shuffled");
    setStatus("Shuffled.");
  }

  function doReset() {
    mistakes = 0;
    selected = [];
    locked = new Set();
    solvedGroups = [];
    order = shuffle([...allWords]);
    renderSolved();
    renderGrid();
    showPopup("Reset");
    setStatus("Reset.");
  }

  submitBtn.addEventListener("click", submit);
  deselectBtn.addEventListener("click", () => { resetSelection(); showPopup("Cleared"); setStatus("Deselected."); });
  shuffleBtn.addEventListener("click", doShuffle);
  resetBtn.addEventListener("click", doReset);

  renderSolved();
  renderGrid();
  setStatus("Ready.");
}

(async function main() {
  try {
    const puzzle = await loadPuzzle();
    initConnections(puzzle);
  } catch (e) {
    const status = document.getElementById("status");
    if (status) status.textContent = `Error: ${e.message}`;
  }
})();
