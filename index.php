<?php
session_start();
$isLoggedIn = isset($_SESSION['user_id']);
$userName = $_SESSION['user_name'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#fff5fa">
    <meta name="description" content="Memory Booster - Play memory matching games, improve concentration and track your progress.">
    <title>Memory Booster | Train Your Brain</title>

    <link rel="stylesheet" href="assets/style.css">
    <script src="assets/app.js" defer></script>
</head>
<body>
    <div class="app-shell">

        <!-- HEADER -->
        <header class="topbar">
            <a href="#" class="brand" id="homeBrand" aria-label="Memory Booster home">
                <span class="brand-icon">🧠</span>
                <span>Memory <strong>Booster</strong></span>
            </a>

            <div class="header-actions">
                <button class="icon-button" id="soundToggle"
                        type="button" aria-label="Toggle sound" title="Sound">
                    🔊
                </button>

                <button class="icon-button" id="themeToggle"
                        type="button" aria-label="Toggle dark and light theme"
                        title="Switch theme">
                    🌙
                </button>

                <?php if ($isLoggedIn): ?>
                    <button class="small-button" id="logoutBtn" type="button">
                        Log out
                    </button>
                <?php endif; ?>
            </div>
        </header>

        <main>

            <!-- AUTHENTICATION SCREEN -->
            <section class="screen auth-screen" id="authScreen"
                     <?php echo $isLoggedIn ? 'hidden' : ''; ?>>

                <div class="auth-art" aria-hidden="true">
                    <div class="floating-emoji emoji-one">🧩</div>
                    <div class="floating-emoji emoji-two">🌷</div>
                    <div class="floating-emoji emoji-three">⭐</div>

                    <div class="brain-card">
                        <span>🧠</span>
                        <p>Think. Match. Remember.</p>
                    </div>
                </div>

                <div class="auth-card">
                    <span class="eyebrow">A LITTLE FUN FOR YOUR BRAIN</span>
                    <h1>Your mind deserves<br>some playtime ✨</h1>
                    <p class="muted">
                        Match the cards, sharpen your memory and celebrate
                        every little improvement.
                    </p>

                    <div class="auth-tabs" role="tablist" aria-label="Account options">
                        <button class="auth-tab active" id="loginTab"
                                type="button" role="tab" aria-selected="true">
                            Log in
                        </button>
                        <button class="auth-tab" id="registerTab"
                                type="button" role="tab" aria-selected="false">
                            Create account
                        </button>
                    </div>

                    <form id="authForm">
                        <input type="hidden" id="authMode" name="action" value="login">

                        <div class="form-group" id="nameGroup" hidden>
                            <label for="authName">Your name</label>
                            <input type="text" id="authName" name="name"
                                   placeholder="Enter your name"
                                   maxlength="60" autocomplete="name">
                        </div>

                        <div class="form-group">
                            <label for="authEmail">Email address</label>
                            <input type="email" id="authEmail" name="email"
                                   placeholder="you@example.com"
                                   maxlength="190" autocomplete="email"
                                   required>
                        </div>

                        <div class="form-group">
                            <label for="authPassword">Password</label>
                            <input type="password" id="authPassword"
                                   name="password"
                                   placeholder="At least 8 characters"
                                   minlength="8" maxlength="72"
                                   autocomplete="current-password" required>
                        </div>

                        <p class="form-message" id="authMessage"
                           role="status" aria-live="polite"></p>

                        <button class="primary-button full-button"
                                type="submit" id="authSubmit">
                            Log in <span>→</span>
                        </button>
                    </form>

                    <p class="auth-note">
                        🔒 Your account will keep your personal game history.
                    </p>
                </div>
            </section>

            <!-- DASHBOARD -->
            <section class="screen dashboard-screen" id="dashboardScreen"
                     <?php echo !$isLoggedIn ? 'hidden' : ''; ?>>

                <div class="welcome-row">
                    <div>
                        <span class="eyebrow">YOUR LITTLE CORNER OF CALM</span>
                        <h1>Welcome<span id="welcomeName"></span>! 🌸</h1>
                        <p class="muted">Ready to give your memory a workout?</p>
                    </div>
                    <div class="welcome-illustration" aria-hidden="true">🌷</div>
                </div>

                <!-- PLAYER STATS -->
                <div class="stats-grid">
                    <article class="stat-card stat-lilac">
                        <span class="stat-icon">🎮</span>
                        <span class="stat-label">Games played</span>
                        <strong id="gamesPlayed">0</strong>
                    </article>

                    <article class="stat-card stat-blue">
                        <span class="stat-icon">🏆</span>
                        <span class="stat-label">Best time</span>
                        <strong id="personalBest">--:--</strong>
                    </article>

                    <article class="stat-card stat-peach">
                        <span class="stat-icon">🧩</span>
                        <span class="stat-label">Pairs matched</span>
                        <strong id="totalPairs">0</strong>
                    </article>
                </div>

                <!-- GAME SETUP -->
                <section class="panel setup-panel">
                    <div class="section-heading">
                        <div>
                            <span class="eyebrow">MAKE IT YOUR GAME</span>
                            <h2>Choose your challenge</h2>
                        </div>
                        <span class="heading-decoration">✿</span>
                    </div>

                    <form id="gameSetupForm">

                        <div class="setting-group">
                            <label class="setting-label">Game mode</label>
                            <div class="choice-grid mode-grid">
                                <label class="choice-card">
                                    <input type="radio" name="mode"
                                           value="single" checked>
                                    <span class="choice-content">
                                        <span class="choice-icon">🧍</span>
                                        <strong>Solo</strong>
                                        <small>Play at your pace</small>
                                    </span>
                                </label>

                                <label class="choice-card">
                                    <input type="radio" name="mode"
                                           value="two">
                                    <span class="choice-content">
                                        <span class="choice-icon">👯</span>
                                        <strong>2 players</strong>
                                        <small>Take turns</small>
                                    </span>
                                </label>

                                <label class="choice-card">
                                    <input type="radio" name="mode"
                                           value="three">
                                    <span class="choice-content">
                                        <span class="choice-icon">🎎</span>
                                        <strong>3 players</strong>
                                        <small>Play together</small>
                                    </span>
                                </label>

                                <label class="choice-card">
                                    <input type="radio" name="mode"
                                           value="multi">
                                    <span class="choice-content">
                                        <span class="choice-icon">🎉</span>
                                        <strong>Multiplayer</strong>
                                        <small>Up to 4 players</small>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div class="settings-row">
                            <div class="setting-group">
                                <label for="difficulty" class="setting-label">
                                    Difficulty
                                </label>
                                <select id="difficulty" name="difficulty">
                                    <option value="easy">Easy · 6 pairs</option>
                                    <option value="medium" selected>
                                        Medium · 8 pairs
                                    </option>
                                    <option value="hard">Hard · 12 pairs</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </div>

                            <div class="setting-group" id="customPairsGroup" hidden>
                                <label for="customPairs" class="setting-label">
                                    Number of pairs
                                </label>
                                <select id="customPairs" name="customPairs">
                                    <option value="4">4 pairs</option>
                                    <option value="6">6 pairs</option>
                                    <option value="8" selected>8 pairs</option>
                                    <option value="10">10 pairs</option>
                                    <option value="12">12 pairs</option>
                                    <option value="15">15 pairs</option>
                                </select>
                            </div>
                        </div>

                        <div class="setting-group">
                            <label for="category" class="setting-label">
                                Card theme
                            </label>

                            <div class="category-grid">
                                <label class="category-card">
                                    <input type="radio" name="category"
                                           value="animals" checked>
                                    <span>🐻</span>
                                    <strong>Animals</strong>
                                </label>

                                <label class="category-card">
                                    <input type="radio" name="category"
                                           value="nature">
                                    <span>🌿</span>
                                    <strong>Nature</strong>
                                </label>

                                <label class="category-card">
                                    <input type="radio" name="category"
                                           value="food">
                                    <span>🍓</span>
                                    <strong>Food</strong>
                                </label>

                                <label class="category-card">
                                    <input type="radio" name="category"
                                           value="mixed">
                                    <span>🎨</span>
                                    <strong>Mixed</strong>
                                </label>
                            </div>
                        </div>

                        <div class="settings-row">
                            <div class="setting-group">
                                <label for="timerMode" class="setting-label">
                                    Timer
                                </label>
                                <select id="timerMode" name="timerMode">
                                    <option value="relaxed">Relaxed</option>
                                    <option value="countdown">Countdown</option>
                                    <option value="both">Both timers</option>
                                    <option value="off">No timer</option>
                                </select>
                            </div>

                            <div class="setting-group" id="countdownGroup" hidden>
                                <label for="countdownMinutes" class="setting-label">
                                    Countdown length
                                </label>
                                <select id="countdownMinutes" name="countdownMinutes">
                                    <option value="1">1 minute</option>
                                    <option value="2" selected>2 minutes</option>
                                    <option value="3">3 minutes</option>
                                    <option value="5">5 minutes</option>
                                </select>
                            </div>
                        </div>

                        <button class="primary-button full-button"
                                id="startGameBtn" type="submit">
                            Start memory game <span>→</span>
                        </button>
                    </form>
                </section>

                <!-- DAILY CHALLENGE -->
                <section class="panel daily-panel">
                    <div class="daily-icon">🌟</div>
                    <div class="daily-copy">
                        <span class="eyebrow">YOUR DAILY MOMENT</span>
                        <h2>Daily memory challenge</h2>
                        <p class="muted">
                            A fresh little challenge to keep your brain active.
                        </p>
                    </div>
                    <button class="secondary-button" id="dailyChallengeBtn"
                            type="button">
                        Play today <span>→</span>
                    </button>
                </section>

                <!-- HISTORY AND LEADERBOARD -->
                <div class="lower-grid">
                    <section class="panel">
                        <div class="section-heading">
                            <h2>Recent games 📚</h2>
                        </div>
                        <div id="historyList" class="history-list">
                            <p class="muted">Your completed games will appear here.</p>
                        </div>
                    </section>

                    <section class="panel">
                        <div class="section-heading">
                            <h2>Leaderboard 🏆</h2>
                        </div>
                        <div id="leaderboardList" class="leaderboard-list">
                            <p class="muted">Your leaderboard will appear here.</p>
                        </div>
                    </section>
                </div>
            </section>

            <!-- MEMORY GAME -->
            <section class="screen game-screen" id="gameScreen" hidden>
                <div class="game-top">
                    <button class="text-button" id="backToDashboard"
                            type="button">
                        ← Dashboard
                    </button>
                    <span class="game-pill" id="gameModeLabel">Solo game</span>
                    <button class="text-button" id="restartGameBtn"
                            type="button">
                        ↻ Restart
                    </button>
                </div>

                <div class="game-heading">
                    <span class="eyebrow">FOCUS YOUR MIND</span>
                    <h1>Find the matching pairs 🧩</h1>
                    <p class="muted" id="gameInstructions">
                        Flip two cards and find a matching pair.
                    </p>
                </div>

                <div class="game-stats">
                    <div class="game-stat">
                        <span>⏱️</span>
                        <small>Time</small>
                        <strong id="elapsedTime">00:00</strong>
                    </div>

                    <div class="game-stat">
                        <span>🎯</span>
                        <small>Moves</small>
                        <strong id="moveCount">0</strong>
                    </div>

                    <div class="game-stat">
                        <span>💖</span>
                        <small>Pairs</small>
                        <strong id="matchedCount">0 / 8</strong>
                    </div>

                    <div class="game-stat" id="countdownStat" hidden>
                        <span>⌛</span>
                        <small>Time left</small>
                        <strong id="countdownTime">02:00</strong>
                    </div>
                </div>

                <div class="turn-panel" id="turnPanel" hidden>
                    <span>🎲</span>
                    <div>
                        <strong id="currentPlayerLabel">Player 1's turn</strong>
                        <p class="muted" id="turnHint">
                            Find a pair to earn a point.
                        </p>
                    </div>
                </div>

                <div class="player-scoreboard" id="playerScoreboard" hidden></div>

                <div class="game-board-wrap">
                    <div class="game-board" id="gameBoard"
                         aria-label="Memory matching game board"></div>
                </div>

                <div class="game-footer">
                    <p>🌷 Take your time. Every match is progress!</p>
                    <button class="secondary-button" id="restartGameBtnBottom"
                            type="button">
                        Play again ↻
                    </button>
                </div>
            </section>

            <!-- RESULTS -->
            <section class="screen result-screen" id="resultScreen" hidden>
                <div class="result-hero">
                    <div class="result-art" id="resultEmoji">🏆</div>
                    <span class="eyebrow">LOOK AT YOU GO!</span>
                    <h1 id="resultTitle">Beautifully done!</h1>
                    <p class="muted" id="resultMessage">
                        Every game is a step forward.
                    </p>
                </div>

                <div class="result-stats">
                    <article class="result-stat">
                        <span>⏱️</span>
                        <small>Time</small>
                        <strong id="resultTime">00:00</strong>
                    </article>

                    <article class="result-stat">
                        <span>🎯</span>
                        <small>Total moves</small>
                        <strong id="resultMoves">0</strong>
                    </article>

                    <article class="result-stat">
                        <span>🧩</span>
                        <small>Pairs found</small>
                        <strong id="resultPairs">0 / 8</strong>
                    </article>

                    <article class="result-stat">
                        <span>⭐</span>
                        <small>Your score</small>
                        <strong id="resultScore">0</strong>
                    </article>
                </div>

                <section class="panel result-player-panel" id="resultPlayersPanel" hidden>
                    <h2>Player scores</h2>
                    <div id="resultPlayers"></div>
                </section>

                <div class="result-actions">
                    <button class="primary-button" id="playAgainBtn" type="button">
                        Play again ↻
                    </button>
                    <button class="secondary-button" id="resultDashboardBtn"
                            type="button">
                        Back to dashboard
                    </button>
                </div>
            </section>

        </main>

        <footer class="site-footer">
            <p>Made with 💗 for curious minds.</p>
            <p>Memory Booster · Think • Match • Remember</p>
        </footer>

        <!-- TOAST NOTIFICATIONS -->
        <div id="toast" class="toast" role="status"
             aria-live="polite" hidden></div>

    </div>

    <script>
        window.MEMORY_BOOSTER = {
            loggedIn: <?php echo $isLoggedIn ? 'true' : 'false'; ?>,
            userName: <?php echo json_encode(
                $userName,
                JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT
            ); ?>,
            apiUrl: "api.php"
        };
    </script>
</body>
</html>
