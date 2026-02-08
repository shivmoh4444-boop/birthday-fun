function qs(name) {
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function normDate(s) {
  return (s || "").trim();
}

function setBlur(imgEl, blurPx) {
  imgEl.style.filter = `blur(${blurPx}px)`;
}

async function loadPuzzle() {
  const puzzleId = qs("p") || "demo";
  const res = await fetch(`data/blurdate-${encodeURIComponent(puzzleId)}.json`);
  if (!res.ok) throw new Error(`Puzzle not found: ${puzzleId}`);
  const data = await res.json();

  // expected: { puzzleId, imagePath, answerDate }
  const imagePath = data.imagePath;
  const answerDate = normDate(data.answerDate);

  // Light validation: you can enforce YYYY-MM-DD yourself
  if (!imagePath) throw new Error("Missing imagePath in blurdate puzzle.");
  if (!answerDate) throw new Error("Missing answerDate in blurdate puzzle.");

  return { puzzleId, imagePath, answerDate };
}

function initBlurDate({ puzzleId, imagePath, answerDate }) {
  const photo = document.getElementById("photo");
  const guessEl = document.getElementById("guess");
  const statusEl = document.getElementById("status");
  const submitBtn = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");

  const maxTurns = 5;
  let turn = 1;
  let done = false;

  // Blur schedule: start very blurry, end clear-ish by last turn
  const blurLevels = [18, 14, 10, 6, 2]; // 5 turns
  photo.src = imagePath;

  function setStatus(msg) {
    statusEl.textContent = `Puzzle: ${puzzleId} • Turn ${turn}/${maxTurns} • ${msg}`;
  }

  function applyBlurForTurn() {
    const idx = Math.min(maxTurns, Math.max(1, turn)) - 1;
    setBlur(photo, blurLevels[idx]);
  }

  function reset() {
    turn = 1;
    done = false;
    guessEl.value = "";
    applyBlurForTurn();
    setStatus("Make a guess.");
  }

  function submit() {
    if (done) return;

    const g = normDate(guessEl.value);
    if (!g) {
      setStatus("Type a date in YYYY-MM-DD.");
      return;
    }

    if (g === answerDate) {
      done = true;
      setBlur(photo, 0);
      setStatus("Correct! 🎉");
      return;
    }

    // Wrong
    if (turn >= maxTurns) {
      done = true;
      setBlur(photo, 0);
      setStatus(`Out of turns. Answer was ${answerDate}.`);
      return;
    }

    turn++;
    applyBlurForTurn();
    setStatus("Wrong — try again (image is clearer now).");
  }

  submitBtn.addEventListener("click", submit);
  resetBtn.addEventListener("click", reset);

  // Enter key submits
  guessEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });

  reset();
}

(async function main() {
  try {
    const puzzle = await loadPuzzle();
    initBlurDate(puzzle);
  } catch (e) {
    const status = document.getElementById("status");
    if (status) status.textContent = `Error: ${e.message}`;
  }
})();
