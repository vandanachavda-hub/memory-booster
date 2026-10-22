
"use strict";

/* =========================================
   MEMORY BOOSTER - MAIN GAME LOGIC
   Fixed: Instant card emoji reveal
   ========================================= */

const CONFIG = window.MEMORY_BOOSTER || {
    loggedIn: false,
    userName: "",
    apiUrl: "api.php"
};

const $ = (id) => document.getElementById(id);

const screens = {
    auth: $("authScreen"),
    dashboard: $("dashboardScreen"),
    game: $("gameScreen"),
    result: $("resultScreen")
};

const state = {
    userName: CONFIG.userName || "",
    loggedIn: Boolean(CONFIG.loggedIn),
    authMode: "login",
    soundOn: true,
    darkTheme: false,
    gameActive: false,
    gameFinished: false,
    dailyChallenge: false,
    mode: "single",
    difficulty: "medium",
    category: "animals",
    timerMode: "relaxed",
    totalPairs: 8,
    moves: 0,
    matchedPairs: 0,
    elapsedSeconds: 0,
    countdownSeconds: 120,
    cards: [],
    firstCard: null,
    secondCard: null,
    lockBoard: false,
    playerCount: 1,
    currentPlayer: 0,
    players: [],
    startTimestamp: 0,
    timerInterval: null,
    flipTimeout: null,
    toastTimeout: null,
    lastGameSettings: null
};

const EMOJI_SETS = {
    animals: [
        "🐻", "🦊", "🐼", "🐸", "🐰", "🐱", "🐶", "🦁",
        "🐵", "🐨", "🐯", "🐷", "🐮", "🐹", "🐧", "🦋",
        "🐢", "🐬", "🦄", "🐙"
    ],
    nature: [
        "🌸", "🌷", "🌻", "🌹", "🍀", "🌿", "🌵", "🌴",
        "🌈", "⭐", "🌙", "☀️", "🌼", "🍁", "🌺", "🌳",
        "☁️", "❄️", "🌊", "🌱"
    ],
    food: [
        "🍓", "🍒", "🍉", "🍍", "🍇", "🍋", "🍑", "🥝",
        "🍎", "🍐", "🍊", "🥥", "🍪", "🍰", "🍩", "🧁",
        "🍕", "🍟", "🍔", "🍦"
    ],
    mixed: [
        "🧸", "🎈", "🎀", "💎", "🎨", "🎵", "🚀", "🎁",
        "💖", "🌟", "👑", "🪄", "🦋", "🧩", "🎯", "🎲",
        "📚", "☂️", "🪻", "🪁"
    ]
};

/* =========================================
   HELPERS
   ========================================= */

function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

function formatTime(totalSeconds) {
    const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value);
}

function showScreen(screenName) {
    Object.entries(screens).forEach(([name, element]) => {
        if (element) element.hidden = name !== screenName;
    });

    window.scrollTo({ top: 0, behavior: "auto" });
}

function showToast(message) {
    const toast = $("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.hidden = false;

    clearTimeout(state.toastTimeout);

    state.toastTimeout = setTimeout(() => {
        toast.hidden = true;
    }, 2500);
}

function setMessage(elementId, message, isError = true) {
    const element = $(elementId);
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#c04c79" : "#478764";
}

async function apiRequest(action, data = {}) {
    const response = await fetch(CONFIG.apiUrl, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({ ...data, action })
    });

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("Invalid server response. Please check your PHP files.");
    }

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Something went wrong.");
    }

    return result;
}

/* =========================================
   SOUND
   ========================================= */

let audioContext = null;

function playSound(type = "flip") {
    if (!state.soundOn) return;

    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) audioContext = new AudioContextClass();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const notes = {
            flip: [440, 0.045],
            match: [740, 0.12],
            wrong: [230, 0.09],
            win: [880, 0.20],
            click: [520, 0.04]
        };

        const [frequency, duration] = notes[type] || notes.click;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.08, audioContext.currentTime + 0.01
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001, audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration + 0.01);
    } catch {
        // Sound is optional.
    }
}

function updateSoundButton() {
    const button = $("soundToggle");
    if (!button) return;

    button.textContent = state.soundOn ? "🔊" : "🔇";
    button.setAttribute(
        "aria-label",
        state.soundOn ? "Turn sound off" : "Turn sound on"
    );
}

/* =========================================
   THEME
   ========================================= */

function applyTheme(isDark) {
    state.darkTheme = isDark;
    document.body.classList.toggle("dark-theme", isDark);

    const button = $("themeToggle");

    if (button) {
        button.textContent = isDark ? "☀️" : "🌙";
        button.title = isDark
            ? "Switch to light theme"
            : "Switch to dark theme";
    }

    try {
        localStorage.setItem("mb_theme", isDark ? "dark" : "light");
    } catch {
        // Storage is optional.
    }
}

function initTheme() {
    let savedTheme = "light";

    try {
        savedTheme = localStorage.getItem("mb_theme") || "light";
    } catch {
        // Use light theme.
    }

    applyTheme(savedTheme === "dark");
}

/* =========================================
   LOGIN AND REGISTRATION
   ========================================= */

function setAuthMode(mode) {
    state.authMode = mode;
    const isRegister = mode === "register";

    if ($("authMode")) $("authMode").value = mode;
    if ($("nameGroup")) $("nameGroup").hidden = !isRegister;
    if ($("authName")) $("authName").required = isRegister;

    $("loginTab")?.classList.toggle("active", !isRegister);
    $("registerTab")?.classList.toggle("active", isRegister);

    $("loginTab")?.setAttribute("aria-selected", String(!isRegister));
    $("registerTab")?.setAttribute("aria-selected", String(isRegister));

    if ($("authSubmit")) {
        $("authSubmit").innerHTML = isRegister
            ? 'Create account <span>→</span>'
            : 'Log in <span>→</span>';
    }

    if ($("authPassword")) {
        $("authPassword").autocomplete = isRegister
            ? "new-password"
            : "current-password";
    }

    setMessage("authMessage", "");
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    const submitButton = $("authSubmit");
    if (!submitButton) return;

    const selectedMode = state.authMode;
    const originalText = submitButton.innerHTML;

    const data = {
        name: $("authName")?.value.trim() || "",
        email: $("authEmail")?.value.trim() || "",
        password: $("authPassword")?.value || ""
    };

    if (selectedMode === "register" && !data.name) {
        setMessage("authMessage", "Please enter your name.");
        return;
    }

    if (!data.email) {
        setMessage("authMessage", "Please enter your email.");
        return;
    }

    if (data.password.length < 8) {
        setMessage("authMessage", "Your password must be at least 8 characters.");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Please wait...";

    try {
        const result = await apiRequest(selectedMode, data);

        state.loggedIn = true;
        state.userName = result.user?.name || data.name || "Player";

        CONFIG.loggedIn = true;
        CONFIG.userName = state.userName;

        $("authForm")?.reset();
        setAuthMode("login");

        updateWelcomeName();
        showScreen("dashboard");
        await loadDashboard();

        showToast(
            selectedMode === "register"
                ? "Your account is ready! 🎉"
                : "Welcome back! 🧠"
        );
    } catch (error) {
        setMessage("authMessage", error.message);
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
    }
}

async function handleLogout() {
    try {
        await apiRequest("logout");
    } catch (error) {
        console.error("Logout request failed.", error);
    }

    stopTimer();
    clearTimeout(state.flipTimeout);

    state.loggedIn = false;
    state.userName = "";
    state.gameActive = false;
    CONFIG.loggedIn = false;
    CONFIG.userName = "";

    showScreen("auth");
    setAuthMode("login");
    showToast("You have logged out.");
}

/* =========================================
   DASHBOARD AND HISTORY
   ========================================= */

function updateWelcomeName() {
    const element = $("welcomeName");
    if (!element) return;

    element.textContent = state.userName ? `, ${state.userName}` : "";
}

function renderHistory(games) {
    const container = $("historyList");
    if (!container) return;

    container.replaceChildren();

    if (!Array.isArray(games) || games.length === 0) {
        const empty = document.createElement("p");
        empty.className = "muted";
        empty.textContent = "No games yet. Play your first game! 🎮";
        container.append(empty);
        return;
    }

    games.forEach((game) => {
        const row = document.createElement("div");
        row.className = "history-item";

        const icon = document.createElement("span");
        icon.className = "history-icon";
        icon.textContent = "🧩";

        const copy = document.createElement("div");
        copy.className = "history-copy";

        const title = document.createElement("strong");
        title.textContent = `${game.mode || "Solo"} · ${game.difficulty || "Game"}`;

        const detail = document.createElement("small");
        detail.textContent =
            `${game.moves ?? 0} moves · ${formatTime(game.time_seconds ?? 0)}`;

        const score = document.createElement("span");
        score.className = "history-score";
        score.textContent = `${game.score ?? 0} pts`;

        copy.append(title, detail);
        row.append(icon, copy, score);
        container.append(row);
    });
}

/* =========================================
   LEADERBOARD
   ========================================= */

const DEMO_PLAYERS = [
    { name: "Arya", score: 940, difficulty: "Hard Mode" },
    { name: "Digna", score: 825, difficulty: "Medium Mode" },
    { name: "Karma", score: 710, difficulty: "Hard Mode" },
    { name: "Tanisha", score: 625, difficulty: "Easy Mode" }
];

function renderLeaderboard(entries) {
    const container = $("leaderboardList");
    if (!container) return;

    container.replaceChildren();

    const players = Array.isArray(entries) ? [...entries] : [];

    DEMO_PLAYERS.forEach((demo) => {
        const exists = players.some(
            (player) =>
                String(player.name || "").toLowerCase() === demo.name.toLowerCase()
        );

        if (!exists) players.push({ ...demo, isDemo: true });
    });

    players.sort((a, b) =>
        Number(b.score ?? b.best_score ?? 0) -
        Number(a.score ?? a.best_score ?? 0)
    );

    players.slice(0, 8).forEach((entry, index) => {
        const row = document.createElement("div");
        row.className = "leaderboard-item";

        const rank = document.createElement("span");
        rank.className = "leaderboard-rank";
        rank.textContent = ["🥇", "🥈", "🥉"][index] || `#${index + 1}`;

        const copy = document.createElement("div");
        copy.className = "leaderboard-copy";

        const name = document.createElement("strong");
        name.textContent = entry.name || "Player";

        const detail = document.createElement("small");
        detail.textContent = entry.isDemo
            ? `${entry.difficulty} · Demo player`
            : (entry.difficulty || "Memory game");

        const score = document.createElement("span");
        score.className = "leaderboard-score";

        if (entry.score != null || entry.best_score != null) {
            score.textContent = `${Number(entry.score ?? entry.best_score)} pts`;
        } else if (entry.time_seconds != null) {
            score.textContent = formatTime(entry.time_seconds);
        } else {
            score.textContent = "—";
        }

        copy.append(name, detail);
        row.append(rank, copy, score);
        container.append(row);
    });
}

async function loadDashboard() {
    if (!state.loggedIn) return;

    updateWelcomeName();

    try {
        const result = await apiRequest("dashboard");
        const dashboard = result.dashboard || result;

        setText("gamesPlayed", dashboard.games_played ?? 0);
        setText(
            "personalBest",
            dashboard.best_time_seconds == null
                ? "--:--"
                : formatTime(dashboard.best_time_seconds)
        );
        setText("totalPairs", dashboard.total_pairs ?? 0);

        renderHistory(dashboard.history || []);
        renderLeaderboard(dashboard.leaderboard || []);
    } catch (error) {
        console.error("Dashboard could not be loaded.", error);
        showToast("Could not load your saved history.");
    }
}

/* =========================================
   GAME SETTINGS
   ========================================= */

function getSelectedValue(name, fallback) {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    return selected ? selected.value : fallback;
}

function getPlayerCount(mode) {
    if (mode === "two") return 2;
    if (mode === "three") return 3;
    if (mode === "multi") return 4;
    return 1;
}

function getPairCount(difficulty, customPairs) {
    if (difficulty === "easy") return 6;
    if (difficulty === "medium") return 8;
    if (difficulty === "hard") return 12;

    const parsed = Number(customPairs);
    return [4, 6, 8, 10, 12, 15].includes(parsed) ? parsed : 8;
}

function updateSetupVisibility() {
    if ($("customPairsGroup") && $("difficulty")) {
        $("customPairsGroup").hidden = $("difficulty").value !== "custom";
    }

    if ($("countdownGroup") && $("timerMode")) {
        const timerMode = $("timerMode").value;
        $("countdownGroup").hidden =
            timerMode !== "countdown" && timerMode !== "both";
    }
}

function readGameSettings() {
    const mode = getSelectedValue("mode", "single");
    const difficulty = $("difficulty")?.value || "medium";
    const category = getSelectedValue("category", "animals");
    const timerMode = $("timerMode")?.value || "relaxed";
    const customPairs = $("customPairs")?.value || "8";

    return {
        mode,
        difficulty,
        category,
        timerMode,
        totalPairs: getPairCount(difficulty, customPairs),
        playerCount: getPlayerCount(mode),
        countdownSeconds:
            Math.max(1, Number($("countdownMinutes")?.value || 2)) * 60
    };
}

/* =========================================
   START AND RESTART GAME
   ========================================= */

function startGame(settings = null) {
    if (!state.loggedIn) {
        showScreen("auth");
        showToast("Please log in to play.");
        return;
    }

    stopTimer();
    clearTimeout(state.flipTimeout);

    const selected = settings || readGameSettings();

    state.mode = selected.mode || "single";
    state.difficulty = selected.difficulty || "medium";
    state.category = selected.category || "animals";
    state.timerMode = selected.timerMode || "relaxed";
    state.totalPairs = Math.max(1, Number(selected.totalPairs) || 8);
    state.playerCount = Math.max(1, Number(selected.playerCount) || 1);
    state.countdownSeconds = Number(selected.countdownSeconds) || 120;

    state.moves = 0;
    state.matchedPairs = 0;
    state.elapsedSeconds = 0;
    state.firstCard = null;
    state.secondCard = null;
    state.lockBoard = false;
    state.gameFinished = false;
    state.gameActive = true;
    state.currentPlayer = 0;

    state.players = Array.from({ length: state.playerCount }, (_, index) => ({
        name: state.playerCount === 1
            ? state.userName || "You"
            : `Player ${index + 1}`,
        score: 0,
        pairs: 0
    }));

    state.lastGameSettings = { ...selected };
    state.dailyChallenge = Boolean(selected.dailyChallenge);

    const availableEmojis = EMOJI_SETS[state.category] || EMOJI_SETS.animals;
    const emojis = shuffle(availableEmojis).slice(
        0,
        Math.min(state.totalPairs, availableEmojis.length)
    );

    state.totalPairs = emojis.length;

    state.cards = shuffle(
        emojis.flatMap((emoji, index) => [
            { id: `${index}-a`, pairId: index, emoji, flipped: false, matched: false },
            { id: `${index}-b`, pairId: index, emoji, flipped: false, matched: false }
        ])
    );

    setText("gameModeLabel", state.playerCount === 1
        ? "Solo game"
        : `${state.playerCount} players`);

    setText("gameInstructions", state.playerCount === 1
        ? "Flip two cards and find a matching pair."
        : "Take turns and find matching pairs.");

    setText("moveCount", "0");
    setText("matchedCount", `0 / ${state.totalPairs}`);
    setText("elapsedTime", "00:00");
    setText("countdownTime", formatTime(state.countdownSeconds));

    if ($("countdownStat")) {
        $("countdownStat").hidden =
            state.timerMode !== "countdown" && state.timerMode !== "both";
    }

    if ($("turnPanel")) $("turnPanel").hidden = state.playerCount === 1;
    if ($("playerScoreboard")) {
        $("playerScoreboard").hidden = state.playerCount === 1;
    }

    renderGameBoard();
    renderPlayerScores();
    updateTurnDisplay();

    showScreen("game");
    state.startTimestamp = Date.now();

    if (state.timerMode !== "off") startTimer();
}

function restartGame() {
    if (!state.lastGameSettings) {
        showToast("Choose a game to get started!");
        return;
    }

    startGame(state.lastGameSettings);
}

/* =========================================
   GAME BOARD
   ========================================= */

function renderGameBoard() {
    const board = $("gameBoard");
    if (!board) return;

    board.replaceChildren();

    const cardCount = state.cards.length;
    const columns = cardCount <= 12 ? 4 : 6;

    board.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;

    state.cards.forEach((card, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "memory-card";
        button.dataset.index = String(index);
        button.setAttribute("aria-label", `Hidden card ${index + 1}`);

        // Simple card markup: the back and emoji are swapped directly.
        // This avoids relying on a 3D transform to reveal the emoji.
        button.innerHTML = '<span class="card-back">✿</span>';

        board.append(button);
    });
}

function renderPlayerScores() {
    const container = $("playerScoreboard");
    if (!container) return;

    container.replaceChildren();

    state.players.forEach((player, index) => {
        const item = document.createElement("div");
        item.className =
            `player-score${index === state.currentPlayer ? " active" : ""}`;

        const name = document.createElement("strong");
        name.textContent = player.name;

        const score = document.createElement("small");
        score.textContent = `${player.score} points · ${player.pairs} pairs`;

        item.append(name, score);
        container.append(item);
    });
}

function updateTurnDisplay() {
    if (state.playerCount <= 1) return;

    const current = state.players[state.currentPlayer];
    setText("currentPlayerLabel", `${current.name}'s turn`);
    setText("turnHint", "Find a matching pair to earn points.");

    renderPlayerScores();
}

/* =========================================
   INSTANT CARD FLIP
   ========================================= */

function flipCard(index) {
    if (!state.gameActive || state.gameFinished || state.lockBoard) return;

    const card = state.cards[index];
    if (!card || card.flipped || card.matched) return;

    const board = $("gameBoard");
    const button = board?.querySelector(`[data-index="${index}"]`);
    if (!button) return;

    // Update state and the visible card immediately.
    card.flipped = true;
    button.classList.add("flipped", "showing-emoji");
    button.replaceChildren();

    const emoji = document.createElement("span");
    emoji.className = "card-emoji";
    emoji.textContent = card.emoji;

    button.append(emoji);
    button.setAttribute("aria-label", `Card showing ${card.emoji}`);

    playSound("flip");

    if (!state.firstCard) {
        state.firstCard = { ...card, index };
        return;
    }

    state.secondCard = { ...card, index };
    state.moves += 1;
    setText("moveCount", state.moves);

    const first = state.firstCard;
    const second = state.secondCard;

    if (first.pairId === second.pairId) {
        handleMatch(first, second);
    } else {
        handleMismatch(first, second);
    }
}

function handleMatch(first, second) {
    state.cards[first.index].matched = true;
    state.cards[second.index].matched = true;

    const board = $("gameBoard");

    [first.index, second.index].forEach((index) => {
        const button = board?.querySelector(`[data-index="${index}"]`);
        if (!button) return;

        button.classList.add("matched", "showing-emoji");
        button.disabled = true;
        button.setAttribute("aria-label", "Matched pair");
    });

    state.matchedPairs += 1;

    const player = state.players[state.currentPlayer];
    if (player) {
        player.score += 1;
        player.pairs += 1;
    }

    setText("matchedCount", `${state.matchedPairs} / ${state.totalPairs}`);
    playSound("match");

    state.firstCard = null;
    state.secondCard = null;

    renderPlayerScores();

    if (state.matchedPairs === state.totalPairs) {
        finishGame(true);
        return;
    }

    advanceTurn();
}

function handleMismatch(first, second) {
    state.lockBoard = true;
    playSound("wrong");

    state.flipTimeout = setTimeout(() => {
        const board = $("gameBoard");

        [first, second].forEach((card) => {
            const actualCard = state.cards[card.index];
            if (!actualCard || actualCard.matched) return;

            actualCard.flipped = false;

            const button = board?.querySelector(
                `[data-index="${card.index}"]`
            );

            if (button) {
                // Remove the emoji and restore the hidden card back.
                button.classList.remove("flipped", "showing-emoji");
                button.replaceChildren();

                const back = document.createElement("span");
                back.className = "card-back";
                back.textContent = "✿";

                button.append(back);
                button.setAttribute(
                    "aria-label",
                    `Hidden card ${card.index + 1}`
                );
            }
        });

        state.firstCard = null;
        state.secondCard = null;
        state.lockBoard = false;

        advanceTurn();
    }, 700);
}

function advanceTurn() {
    if (state.playerCount <= 1) return;

    state.currentPlayer = (state.currentPlayer + 1) % state.playerCount;
    updateTurnDisplay();
}

/* =========================================
   TIMERS
   ========================================= */

function startTimer() {
    stopTimer();

    state.timerInterval = setInterval(() => {
        if (!state.gameActive || state.gameFinished) {
            stopTimer();
            return;
        }

        state.elapsedSeconds = Math.floor(
            (Date.now() - state.startTimestamp) / 1000
        );

        setText("elapsedTime", formatTime(state.elapsedSeconds));

        if (state.timerMode === "countdown" || state.timerMode === "both") {
            const remaining = state.countdownSeconds - state.elapsedSeconds;

            setText("countdownTime", formatTime(Math.max(0, remaining)));

            if (remaining <= 0) finishGame(false, true);
        }
    }, 250);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

/* =========================================
   SCORE, ACCURACY AND XP
   ========================================= */

function calculateScore() {
    const pairPoints = state.matchedPairs * 100;
    const movePenalty = Math.max(0, state.moves - state.totalPairs) * 5;
    const timePenalty = state.elapsedSeconds;

    return Math.max(0, pairPoints - movePenalty - timePenalty);
}

function calculateAccuracy() {
    if (state.moves === 0) return 0;

    return Math.min(
        100,
        Math.round((state.matchedPairs / state.moves) * 100)
    );
}

function calculateXP(score) {
    return Math.max(0, state.matchedPairs * 20 + Math.round(score / 10));
}

function getAchievement(won, accuracy, score) {
    if (!won) {
        return {
            title: "⚡ Keep Training",
            message: "Every game helps you improve. Try again!"
        };
    }

    if (accuracy >= 80 && score >= 500) {
        return {
            title: "👑 BRAIN BOSS",
            message: "Incredible performance! Your memory is on fire!"
        };
    }

    if (accuracy >= 70) {
        return {
            title: "🧠 MEMORY MASTER",
            message: "Excellent focus! You completed the challenge!"
        };
    }

    return {
        title: "🏆 CHALLENGE COMPLETED",
        message: "Amazing effort! Keep practising to beat your record."
    };
}

/* =========================================
   FINISH GAME AND SHOW RESULTS
   ========================================= */

function finishGame(won, timedOut = false) {
    if (state.gameFinished) return;

    state.gameFinished = true;
    state.gameActive = false;
    state.lockBoard = true;

    stopTimer();
    clearTimeout(state.flipTimeout);

    state.elapsedSeconds = Math.floor(
        Math.max(0, Date.now() - state.startTimestamp) / 1000
    );

    const score = calculateScore();
    const accuracy = calculateAccuracy();
    const xpEarned = calculateXP(score);
    const achievement = getAchievement(won, accuracy, score);

    setText("resultEmoji", won ? "🏆" : timedOut ? "⏰" : "🧠");
    setText("resultTitle", won ? "YOU DID AMAZING!" : timedOut ? "TIME IS UP!" : "GOOD EFFORT!");

    setText(
        "resultMessage",
        won
            ? `Incredible effort, ${state.userName || "Player"}! Every game is brain training.`
            : timedOut
                ? "The countdown ended. Play again to improve your score!"
                : "Every game is practice. Keep training your brain!"
    );

    setText("resultTime", formatTime(state.elapsedSeconds));
    setText("resultMoves", state.moves);
    setText("resultPairs", `${state.matchedPairs} / ${state.totalPairs}`);
    setText("resultScore", score);
    setText("resultAccuracy", `${accuracy}%`);
    setText("resultXP", `+${xpEarned}`);
    setText("resultAchievement", achievement.title);
    setText("resultAchievementMessage", achievement.message);
    setText("resultFinalScore", score);
    setText("resultAccuracyValue", `${accuracy}%`);
    setText("resultXPValue", `+${xpEarned}`);

    const resultPanel = $("resultPlayersPanel");
    if (resultPanel) resultPanel.hidden = state.playerCount === 1;

    renderResultPlayers();
    playSound(won ? "win" : "click");
    showScreen("result");

    saveGameResult({ won, timedOut, score, accuracy, xpEarned });
}

function renderResultPlayers() {
    const container = $("resultPlayers");
    if (!container) return;

    container.replaceChildren();

    const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);

    sortedPlayers.forEach((player, index) => {
        const row = document.createElement("div");
        row.className = "result-player";

        const name = document.createElement("strong");
        name.textContent =
            `${index + 1}. ${player.name}${index === 0 ? " 🏆" : ""}`;

        const score = document.createElement("span");
        score.textContent = `${player.score} points · ${player.pairs} pairs`;

        row.append(name, score);
        container.append(row);
    });
}

/* =========================================
   SAVE RESULT TO PHP / MYSQL
   ========================================= */

async function saveGameResult(resultData) {
    if (!state.loggedIn) return;

    const payload = {
        mode: state.mode,
        difficulty: state.difficulty,
        category: state.category,
        total_pairs: state.totalPairs,
        matched_pairs: state.matchedPairs,
        moves: state.moves,
        time_seconds: state.elapsedSeconds,
        score: resultData.score,
        won: resultData.won,
        daily_challenge: state.dailyChallenge,
        player_count: state.playerCount
    };

    try {
        await apiRequest("save_game", payload);
        await loadDashboard();
    } catch (error) {
        console.error("Game result could not be saved.", error);
        showToast("Game finished, but saving the result failed.");
    }
}

/* =========================================
   DAILY CHALLENGE
   ========================================= */

function startDailyChallenge() {
    startGame({
        mode: "single",
        difficulty: "custom",
        category: "mixed",
        timerMode: "both",
        totalPairs: 6,
        playerCount: 1,
        countdownSeconds: 120,
        dailyChallenge: true
    });
}

/* =========================================
   EVENT LISTENERS
   ========================================= */

function bindEvents() {
    $("loginTab")?.addEventListener("click", () => setAuthMode("login"));
    $("registerTab")?.addEventListener("click", () => setAuthMode("register"));
    $("authForm")?.addEventListener("submit", handleAuthSubmit);

    $("themeToggle")?.addEventListener("click", () => {
        applyTheme(!state.darkTheme);
        playSound("click");
    });

    $("soundToggle")?.addEventListener("click", () => {
        state.soundOn = !state.soundOn;
        updateSoundButton();
        if (state.soundOn) playSound("click");
    });

    $("logoutBtn")?.addEventListener("click", handleLogout);

    $("difficulty")?.addEventListener("change", updateSetupVisibility);
    $("timerMode")?.addEventListener("change", updateSetupVisibility);

    $("gameSetupForm")?.addEventListener("submit", (event) => {
        event.preventDefault();
        startGame();
    });

    $("dailyChallengeBtn")?.addEventListener("click", startDailyChallenge);

    $("gameBoard")?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const button = target.closest(".memory-card");
        if (!button || button.disabled) return;

        const index = Number(button.dataset.index);
        if (Number.isInteger(index)) flipCard(index);
    });

    $("backToDashboard")?.addEventListener("click", () => {
        state.gameActive = false;
        state.gameFinished = true;
        state.lockBoard = true;

        stopTimer();
        clearTimeout(state.flipTimeout);

        showScreen("dashboard");
        loadDashboard();
    });

    $("restartGameBtn")?.addEventListener("click", restartGame);
    $("restartGameBtnBottom")?.addEventListener("click", restartGame);
    $("playAgainBtn")?.addEventListener("click", restartGame);

    $("resultDashboardBtn")?.addEventListener("click", () => {
        state.gameActive = false;
        stopTimer();

        showScreen("dashboard");
        loadDashboard();
    });

    $("homeBrand")?.addEventListener("click", (event) => {
        event.preventDefault();

        if (state.loggedIn) {
            showScreen("dashboard");
            loadDashboard();
        } else {
            showScreen("auth");
        }
    });
}

/* =========================================
   INITIALIZATION
   ========================================= */

async function init() {
    initTheme();
    updateSoundButton();
    updateSetupVisibility();
    bindEvents();

    const logoScreen = $("logoScreen");

    if (logoScreen) {
        logoScreen.hidden = false;

        Object.values(screens).forEach((screen) => {
            if (screen) screen.hidden = true;
        });

        setTimeout(async () => {
            logoScreen.hidden = true;

            if (state.loggedIn) {
                updateWelcomeName();
                showScreen("dashboard");
                await loadDashboard();
            } else {
                showScreen("auth");
                setAuthMode("login");
            }
        }, 2000);

        return;
    }

    if (state.loggedIn) {
        updateWelcomeName();
        showScreen("dashboard");
        await loadDashboard();
    } else {
        showScreen("auth");
        setAuthMode("login");
    }
}

document.addEventListener("DOMContentLoaded", init);
