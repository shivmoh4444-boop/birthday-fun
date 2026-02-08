function qs(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function normalize(w) {
  return w.trim().toUpperCase();
}

async function loadPuzzle() {
  const puzzleId = qs("p") || "demo";
  const res = await fetch(`data/wordle-${encodeURIComponent(puzzleId)}.json`);
  if (!res.ok) throw new Error(`Puzzle not found: ${puzzleId}`);
  const data = await res.json();

  const answer = normalize(data.answer);
  if (answer.length !== 5) throw new Error("Answer must be exactly 5 letters.");

  const allowed = (data.allowed || []).map(normalize);
  return { puzzleId, answer, allowed };
}

// Wordle scoring with duplicates handled properly.
function scoreGuess(guess, answer) {
  // returns array of "good" | "warn" | "bad"
  const g = guess.split("");
  const a = answer.split("");

  const result = Array(5).fill("bad");
  const used = Array(5).fill(false);

  // First pass: greens
  for (let i = 0; i < 5; i++) {
    if (g[i] === a[i]) {
      result[i] = "good";
      used[i] = true;
      g[i] = null; // consume
    }
  }

  // Second pass: yellows
  for (let i = 0; i < 5; i++) {
    if (g[i] == null) continue;
    const idx = a.findIndex((ch, j) => !used[j] && ch === g[i]);
    if (idx !== -1) {
      result[i] = "warn";
      used[idx] = true;
      g[i] = null;
    }
  }

  return result;
}

function initWordle({ puzzleId, answer, allowed }) {
  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("resetBtn");

  const rows = 6;
  const cols = 5;

  let grid = Array.from({ length: rows }, () => Array(cols).fill(""));
  let row = 0;
  let col = 0;
  let done = false;

  function setStatus(msg) {
    statusEl.textContent = `Puzzle: ${puzzleId} • ${msg}`;
  }

  function render() {
    boardEl.innerHTML = "";
    for (let r = 0; r < rows; r++) {
      const rowEl = document.createElement("div");
      rowEl.className = "wordleRow";

      for (let c = 0; c < cols; c++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.textContent = grid[r][c];

        rowEl.appendChild(cell);
      }

      boardEl.appendChild(rowEl);
    }
  }

  function paintRow(r, classes) {
    // Re-render row with scoring classes
    const rowEl = boardEl.children[r];
    for (let c = 0; c < cols; c++) {
      rowEl.children[c].classList.add(classes[c]);
    }
  }

  function currentGuess() {
    return grid[row].join("");
  }

  function validWord(w) {
    if (w.length !== 5) return false;
    if (allowed.length === 0) return true; // allow any if no list provided
    return allowed.includes(w);
  }

  function submit() {
    if (done) return;
    if (col < 5) {
      setStatus("Not enough letters.");
      return;
    }

    const guess = currentGuess();
    if (!validWord(guess)) {
      setStatus("Not in word list.");
      return;
    }

    const classes = scoreGuess(guess, answer);
    paintRow(row, classes);

    if (guess === answer) {
      done = true;
      setStatus("Solved! 🎉");
      return;
    }

    row++;
    col = 0;

    if (row >= rows) {
      done = true;
      setStatus(`Out of tries. Answer was ${answer}.`);
      return;
    }

    setStatus("Keep going.");
  }

  function typeLetter(ch) {
    if (done) return;
    if (row >= rows) return;
    if (col >= cols) return;
    grid[row][col] = ch;
    col++;
    render();
    // repaint scored rows (because render wipes classes)
    for (let r = 0; r < row; r++) {
      const guess = grid[r].join("");
      const classes = scoreGuess(guess, answer);
      paintRow(r, classes);
    }
  }

  function backspace() {
    if (done) return;
    if (col === 0) return;
    col--;
    grid[row][col] = "";
    render();
    for (let r = 0; r < row; r++) {
      const guess = grid[r].join("");
      const classes = scoreGuess(guess, answer);
      paintRow(r, classes);
    }
  }

  function reset() {
    grid = Array.from({ length: rows }, () => Array(cols).fill(""));
    row = 0;
    col = 0;
    done = false;
    render();
    setStatus("Ready.");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") return submit();
    if (e.key === "Backspace") return backspace();

    const k = e.key.toUpperCase();
    if (/^[A-Z]$/.test(k)) typeLetter(k);
  });

  resetBtn.addEventListener("click", reset);

  render();
  setStatus("Ready.");
}

(async function main() {
  try {
    const puzzle = await loadPuzzle();
    initWordle(puzzle);
  } catch (e) {
    document.getElementById("status").textContent = `Error: ${e.message}`;
  }
})();
