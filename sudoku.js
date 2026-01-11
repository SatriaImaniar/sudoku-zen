/**
 * Modern Sudoku - Zen Experience Logic
 * Includes Generator, Solver, Notes Mode, and Interactive UI
 */

class SudokuGame {
  constructor() {
    this.board = Array(9).fill(0).map(() => Array(9).fill(0));
    this.solution = Array(9).fill(0).map(() => Array(9).fill(0));
    this.playerBoard = Array(9).fill(0).map(() => Array(9).fill(0));
    this.notes = Array(81).fill(null).map(() => new Set());

    this.selectedCell = null; // {r, c}
    this.isNotesMode = false;
    this.mistakes = 0;
    this.maxMistakes = 3;
    this.difficulty = 'easy';
    this.timer = 0;
    this.timerInterval = null;
    this.hintsRemaining = 3;
    this.isGameOver = false;

    this.initElements();
    this.initEventListeners();
    this.startNewGame();
  }

  initElements() {
    this.gridElement = document.getElementById('sudoku-board');
    this.mistakesElement = document.getElementById('mistakes-counter');
    this.timerElement = document.getElementById('timer');
    this.notesBtn = document.getElementById('notes-mode-btn');
    this.hintBtn = document.getElementById('hint-btn');
    this.modal = document.getElementById('game-over-modal');
  }

  initEventListeners() {
    // Numpad
    document.querySelectorAll('.num-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleNumberInput(parseInt(btn.dataset.value)));
    });

    // Erase
    document.getElementById('erase-btn').addEventListener('click', () => this.handleErase());

    // Notes Toggle
    this.notesBtn.addEventListener('click', () => this.toggleNotesMode());

    // Difficulty
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.difficulty = btn.dataset.level;
      });
    });

    // Main Actions
    document.getElementById('new-game-btn').addEventListener('click', () => this.startNewGame());
    this.hintBtn.addEventListener('click', () => this.giveHint());
    document.getElementById('restart-btn').addEventListener('click', () => {
      this.modal.classList.add('hidden');
      this.startNewGame();
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
      if (this.isGameOver) return;
      if (e.key >= '1' && e.key <= '9') this.handleNumberInput(parseInt(e.key));
      if (e.key === 'Backspace' || e.key === 'Delete') this.handleErase();
      if (e.key.toLowerCase() === 'n') this.toggleNotesMode();
    });
  }

  // --- GAME ENGINE ---

  startNewGame() {
    this.isGameOver = false;
    this.mistakes = 0;
    this.hintsRemaining = 3;
    this.notes = Array(81).fill(null).map(() => new Set());
    this.selectedCell = null;
    this.updateStats();
    this.resetTimer();
    this.startTimer();

    this.generateFullSudoku();
    this.createPuzzle();
    this.renderBoard();
  }

  generateFullSudoku() {
    this.board = Array(9).fill(0).map(() => Array(9).fill(0));
    this.solve(this.board);
    this.solution = JSON.parse(JSON.stringify(this.board));
  }

  solve(board) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0) {
          const nums = this.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (let num of nums) {
            if (this.isValid(board, row, col, num)) {
              board[row][col] = num;
              if (this.solve(board)) return true;
              board[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
      if (board[row][i] === num || board[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  }

  createPuzzle() {
    this.playerBoard = JSON.parse(JSON.stringify(this.solution));
    let cellsToRemove = this.difficulty === 'easy' ? 35 : this.difficulty === 'medium' ? 45 : 55;

    while (cellsToRemove > 0) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (this.playerBoard[row][col] !== 0) {
        this.playerBoard[row][col] = 0;
        cellsToRemove--;
      }
    }
  }

  // --- UI RENDERING ---

  renderBoard() {
    this.gridElement.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        if (this.playerBoard[r][c] !== 0) {
          cell.textContent = this.playerBoard[r][c];
          cell.classList.add('fixed');
        } else {
          cell.dataset.row = r;
          cell.dataset.col = c;
          cell.addEventListener('click', () => this.selectCell(r, c));
        }
        this.gridElement.appendChild(cell);
      }
    }
  }

  selectCell(r, c) {
    if (this.isGameOver) return;
    this.selectedCell = { r, c };
    this.updateVisualHighlights();
  }

  updateVisualHighlights() {
    const cells = Array.from(this.gridElement.children);
    const { r, c } = this.selectedCell;
    const selectedValue = this.playerBoard[r][c] || null;

    cells.forEach((cell, index) => {
      const row = Math.floor(index / 9);
      const col = index % 9;
      cell.classList.remove('selected', 'highlight-guide', 'highlight-number');

      // Guide lines
      if (row === r || col === c ||
        (Math.floor(row / 3) === Math.floor(r / 3) && Math.floor(col / 3) === Math.floor(c / 3))) {
        cell.classList.add('highlight-guide');
      }

      // Highlighting same numbers
      const cellValue = parseInt(cell.textContent);
      if (selectedValue && cellValue === selectedValue) {
        cell.classList.add('highlight-number');
      }

      // Selected cell
      if (row === r && col === c) {
        cell.classList.add('selected');
      }
    });
  }

  // --- PLAYER INTERACTIONS ---

  handleNumberInput(num) {
    if (!this.selectedCell || this.isGameOver) return;
    const { r, c } = this.selectedCell;

    // Don't allow changing fixed cells (already handled by event listener)

    if (this.isNotesMode) {
      this.toggleNote(r, c, num);
    } else {
      this.placeNumber(r, c, num);
    }
  }

  placeNumber(r, c, num) {
    const cellIndex = r * 9 + c;
    const cellElement = this.gridElement.children[cellIndex];

    if (this.solution[r][c] === num) {
      this.playerBoard[r][c] = num;
      cellElement.textContent = num;
      cellElement.classList.remove('error');
      this.notes[cellIndex].clear(); // Clear notes when filled
      this.checkWin();
      this.updateVisualHighlights();
    } else {
      this.mistakes++;
      this.updateStats();
      cellElement.textContent = num;
      cellElement.classList.add('error');

      if (this.mistakes >= this.maxMistakes) {
        this.endGame(false);
      } else {
        // Flash error and clear
        setTimeout(() => {
          if (this.playerBoard[r][c] === 0) {
            cellElement.textContent = '';
            cellElement.classList.remove('error');
            this.updateBoardCell(r, c); // Restore notes if visible
          }
        }, 1000);
      }
    }
  }

  toggleNote(r, c, num) {
    const index = r * 9 + c;
    if (this.notes[index].has(num)) {
      this.notes[index].delete(num);
    } else {
      this.notes[index].add(num);
    }
    this.updateBoardCell(r, c);
  }

  updateBoardCell(r, c) {
    const index = r * 9 + c;
    const cell = this.gridElement.children[index];

    if (this.playerBoard[r][c] === 0) {
      if (this.notes[index].size > 0) {
        cell.innerHTML = '<div class="notes-container"></div>';
        const container = cell.firstChild;
        for (let i = 1; i <= 9; i++) {
          const note = document.createElement('div');
          note.className = 'note';
          note.textContent = this.notes[index].has(i) ? i : '';
          container.appendChild(note);
        }
      } else {
        cell.textContent = '';
      }
    }
  }

  handleErase() {
    if (!this.selectedCell || this.isGameOver) return;
    const { r, c } = this.selectedCell;
    const index = r * 9 + c;

    if (this.playerBoard[r][c] === 0) {
      this.notes[index].clear();
      this.updateBoardCell(r, c);
    }
  }

  toggleNotesMode() {
    this.isNotesMode = !this.isNotesMode;
    this.notesBtn.classList.toggle('active');
    this.notesBtn.querySelector('span:last-child').textContent = `Notes: ${this.isNotesMode ? 'ON' : 'OFF'}`;
  }

  // --- UTILS ---

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  updateStats() {
    this.mistakesElement.textContent = `${this.mistakes}/${this.maxMistakes}`;
    this.hintBtn.textContent = `Hint (${this.hintsRemaining})`;
  }

  startTimer() {
    this.timerInterval = setInterval(() => {
      this.timer++;
      const mins = Math.floor(this.timer / 60).toString().padStart(2, '0');
      const secs = (this.timer % 60).toString().padStart(2, '0');
      this.timerElement.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  resetTimer() {
    clearInterval(this.timerInterval);
    this.timer = 0;
    this.timerElement.textContent = '00:00';
  }

  giveHint() {
    if (this.hintsRemaining <= 0 || this.isGameOver) return;

    // Find an empty cell
    const emptyCells = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.playerBoard[r][c] === 0) emptyCells.push({ r, c });
      }
    }

    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.placeNumber(r, c, this.solution[r][c]);
      this.hintsRemaining--;
      this.updateStats();
    }
  }

  checkWin() {
    const win = this.playerBoard.every((row, r) =>
      row.every((val, c) => val === this.solution[r][c])
    );
    if (win) this.endGame(true);
  }

  endGame(win) {
    this.isGameOver = true;
    clearInterval(this.timerInterval);
    this.modal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = win ? 'Selamat!' : 'Game Over!';
    document.getElementById('modal-message').textContent = win
      ? `Berhasil dalam ${this.timerElement.textContent}`
      : 'Terlalu banyak kesalahan.';
  }
}

// Start Game
window.onload = () => {
  new SudokuGame();
};