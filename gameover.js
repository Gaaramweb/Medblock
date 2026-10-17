const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/',
  beforeParse(window) {
    window.Image = class { set src(v) { setTimeout(() => this.onerror && this.onerror(), 0); } };
    window.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: (t, k) => (/Gradient/.test(String(k)) ? () => ({ addColorStop() {} }) : () => {}) });
    window.HTMLElement.prototype.getBoundingClientRect = function () { return { width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600 }; };
  } });
const w = dom.window; const errors = []; w.addEventListener('error', (e) => errors.push(e.message + ' @' + e.lineno));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await sleep(500);
  const res = w.eval(`(function(){
    startPuzzleRound();
    const pool = WEIGHTED_POOL;
    for (let attempt = 0; attempt < 40000; attempt++) {
      for (const c of gameBoard.cells) { const cell = gameBoard.map.get(cellKey(c.q,c.r)); cell.occupied = Math.random() < 0.8; cell.honey = false; }
      if (findFullLines(gameBoard, LINES).length) continue;
      const p0 = pool[Math.floor(Math.random()*pool.length)];
      const p1 = pool[Math.floor(Math.random()*pool.length)];
      let spot = null;
      for (const c of gameBoard.cells) { if (canPlace(gameBoard, p0.cells, c.q, c.r)) { spot = c; break; } }
      if (!spot) continue;
      const snap = gameBoard.cells.map(c => gameBoard.map.get(cellKey(c.q,c.r)).occupied);
      placeShape(gameBoard, p0.cells, spot.q, spot.r, -1);
      const noLine = findFullLines(gameBoard, LINES).length === 0;
      const p1fits = canPlaceAnywhere(gameBoard, p1.cells);
      gameBoard.cells.forEach((c,i)=>{ gameBoard.map.get(cellKey(c.q,c.r)).occupied = snap[i]; });
      if (!noLine || p1fits) continue;
      trayPieces[0] = Object.assign({}, p0, {honeyIndex:-1}); trayPieces[1] = null; trayPieces[2] = Object.assign({}, p1, {honeyIndex:-1});
      gameoverOverlay.classList.add('hidden');
      commitPlacement(0, trayPieces[0], spot.q, spot.r);
      return { attempt, overlayHidden: gameoverOverlay.classList.contains('hidden'), contHidden: continueOverlay.classList.contains('hidden'), movesLeft: anyPieceHasAMove(gameBoard, trayPieces) };
    }
    return 'no scenario found';
  })()`);
  const pass = res && res.overlayHidden === false && res.movesLeft === false && errors.length === 0;
  console.log((pass ? '  PASS  ' : '  FAIL  ') + 'stuck board ends the round via the REAL commitPlacement (no stubs): ' + JSON.stringify(res) + ' errors=' + JSON.stringify(errors));
  process.exit(pass ? 0 : 1);
})();
