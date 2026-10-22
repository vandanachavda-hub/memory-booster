<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/config.php';

function respond(bool $success, string $message = '', array $data = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(
        array_merge([
            'success' => $success,
            'message' => $message
        ], $data),
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

function getInput(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);
    return is_array($data) ? $data : [];
}

function requireLogin(): int
{
    if (empty($_SESSION['user_id'])) {
        respond(false, 'Please log in first.', [], 401);
    }

    return (int) $_SESSION['user_id'];
}

function cleanString(mixed $value, int $maxLength = 100): string
{
    if (!is_string($value) && !is_numeric($value)) {
        return '';
    }

    return trim(substr((string) $value, 0, $maxLength));
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(false, 'Use a POST request.', [], 405);
    }

    $input = getInput();
    $action = cleanString($input['action'] ?? '', 40);

    switch ($action) {
        case 'register':
            $name = cleanString($input['name'] ?? '', 60);
            $email = strtolower(cleanString($input['email'] ?? '', 150));
            $password = is_string($input['password'] ?? null)
                ? $input['password']
                : '';

            if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                respond(false, 'Enter a valid name and email address.', [], 422);
            }

            if (strlen($password) < 8) {
                respond(false, 'Password must contain at least 8 characters.', [], 422);
            }

            if (strlen($password) > 4096) {
                respond(false, 'Password is too long.', [], 422);
            }

            $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
            $check->execute([$email]);

            if ($check->fetch()) {
                respond(false, 'This email is already registered. Please log in.', [], 409);
            }

            $hash = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $pdo->prepare(
                'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
            );
            $stmt->execute([$name, $email, $hash]);

            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $pdo->lastInsertId();
            $_SESSION['user_name'] = $name;

            respond(true, 'Account created successfully.', [
                'user' => ['id' => $_SESSION['user_id'], 'name' => $name]
            ]);
            break;

        case 'login':
            $email = strtolower(cleanString($input['email'] ?? '', 150));
            $password = is_string($input['password'] ?? null)
                ? $input['password']
                : '';

            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
                respond(false, 'Enter your email and password.', [], 422);
            }

            $stmt = $pdo->prepare(
                'SELECT id, name, password_hash FROM users WHERE email = ? LIMIT 1'
            );
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password_hash'])) {
                respond(false, 'Incorrect email or password.', [], 401);
            }

            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $user['id'];
            $_SESSION['user_name'] = $user['name'];

            respond(true, 'Login successful.', [
                'user' => [
                    'id' => (int) $user['id'],
                    'name' => $user['name']
                ]
            ]);
            break;

        case 'logout':
            $_SESSION = [];

            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(
                    session_name(),
                    '',
                    time() - 42000,
                    $params['path'],
                    $params['domain'],
                    $params['secure'],
                    $params['httponly']
                );
            }

            session_destroy();
            respond(true, 'You have logged out.');
            break;

        case 'dashboard':
            $userId = requireLogin();

            $stmt = $pdo->prepare(
                'SELECT COUNT(*) AS games_played,
                        COALESCE(SUM(matched_pairs), 0) AS total_pairs
                 FROM games
                 WHERE user_id = ?'
            );
            $stmt->execute([$userId]);
            $stats = $stmt->fetch();

            $stmt = $pdo->prepare(
                "SELECT MIN(time_seconds)
                 FROM games
                 WHERE user_id = ?
                   AND won = 1
                   AND mode = 'single'"
            );
            $stmt->execute([$userId]);
            $bestTime = $stmt->fetchColumn();

            $stmt = $pdo->prepare(
                'SELECT mode, difficulty, category, total_pairs,
                        matched_pairs, moves, time_seconds, score, won, created_at
                 FROM games
                 WHERE user_id = ?
                 ORDER BY created_at DESC, id DESC
                 LIMIT 10'
            );
            $stmt->execute([$userId]);
            $history = $stmt->fetchAll();

            $stmt = $pdo->query(
                "SELECT u.name, g.difficulty, g.time_seconds, g.score
                 FROM games g
                 INNER JOIN users u ON u.id = g.user_id
                 WHERE g.won = 1 AND g.mode = 'single'
                   AND g.id = (
                       SELECT g2.id
                       FROM games g2
                       WHERE g2.user_id = g.user_id
                         AND g2.won = 1
                         AND g2.mode = 'single'
                       ORDER BY g2.time_seconds ASC, g2.score DESC, g2.id ASC
                       LIMIT 1
                   )
                 ORDER BY g.time_seconds ASC, g.score DESC
                 LIMIT 10"
            );
            $leaderboard = $stmt->fetchAll();

            respond(true, 'Dashboard loaded.', [
                'user' => [
                    'id' => $userId,
                    'name' => $_SESSION['user_name'] ?? 'Player'
                ],
                'dashboard' => [
                    'games_played' => (int) $stats['games_played'],
                    'best_time_seconds' => $bestTime === false || $bestTime === null
                        ? null
                        : (int) $bestTime,
                    'total_pairs' => (int) $stats['total_pairs'],
                    'history' => $history,
                    'leaderboard' => $leaderboard
                ]
            ]);
            break;

        case 'save_game':
            $userId = requireLogin();

            $mode = cleanString($input['mode'] ?? 'single', 20);
            $difficulty = cleanString($input['difficulty'] ?? 'easy', 20);
            $category = cleanString($input['category'] ?? 'mixed', 30);

            if (!in_array($mode, ['single', 'two', 'three', 'multi'], true)) {
                respond(false, 'Invalid game mode.', [], 422);
            }

            if (!in_array($difficulty, ['easy', 'medium', 'hard', 'custom'], true)) {
                respond(false, 'Invalid difficulty.', [], 422);
            }

            if (!in_array($category, ['animals', 'nature', 'food', 'mixed'], true)) {
                respond(false, 'Invalid category.', [], 422);
            }

            $totalPairs = filter_var($input['total_pairs'] ?? 0, FILTER_VALIDATE_INT);
            $matchedPairs = filter_var($input['matched_pairs'] ?? 0, FILTER_VALIDATE_INT);
            $moves = filter_var($input['moves'] ?? 0, FILTER_VALIDATE_INT);
            $timeSeconds = filter_var($input['time_seconds'] ?? 0, FILTER_VALIDATE_INT);
            $score = filter_var($input['score'] ?? 0, FILTER_VALIDATE_INT);
            $playerCount = filter_var($input['player_count'] ?? 1, FILTER_VALIDATE_INT);

            foreach ([
                'total pairs' => $totalPairs,
                'matched pairs' => $matchedPairs,
                'moves' => $moves,
                'time' => $timeSeconds,
                'score' => $score,
                'player count' => $playerCount
            ] as $field => $value) {
                if ($value === false || $value < 0) {
                    respond(false, 'Invalid ' . $field . ' value.', [], 422);
                }
            }

            if (
                $totalPairs < 1 || $totalPairs > 30 ||
                $matchedPairs > $totalPairs ||
                $moves > 10000 || $timeSeconds > 86400 ||
                $score > 1000000 || $playerCount < 1 ||
                $playerCount > 4
            ) {
                respond(false, 'Game result is outside allowed limits.', [], 422);
            }

            $won = !empty($input['won']) ? 1 : 0;
            $daily = !empty($input['daily_challenge']) ? 1 : 0;

            $stmt = $pdo->prepare(
                'INSERT INTO games
                 (user_id, mode, difficulty, category, total_pairs,
                  matched_pairs, moves, time_seconds, score, won,
                  daily_challenge, player_count)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            $stmt->execute([
                $userId,
                $mode,
                $difficulty,
                $category,
                $totalPairs,
                $matchedPairs,
                $moves,
                $timeSeconds,
                $score,
                $won,
                $daily,
                $playerCount
            ]);

            respond(true, 'Game result saved.', [
                'game_id' => (int) $pdo->lastInsertId()
            ]);
            break;

        default:
            respond(false, 'Unknown action.', [], 400);
    }
} catch (PDOException $e) {
    error_log('Memory Booster database error: ' . $e->getMessage());
    respond(false, 'A database error occurred. Check your database setup.', [], 500);
} catch (Throwable $e) {
    error_log('Memory Booster API error: ' . $e->getMessage());
    respond(false, 'Something went wrong. Please try again.', [], 500);
}
