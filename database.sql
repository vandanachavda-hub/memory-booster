
CREATE DATABASE IF NOT EXISTS memory_booster
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE memory_booster;

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(60) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    mode VARCHAR(20) NOT NULL DEFAULT 'single',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'easy',
    category VARCHAR(30) NOT NULL DEFAULT 'mixed',
    total_pairs INT UNSIGNED NOT NULL DEFAULT 0,
    matched_pairs INT UNSIGNED NOT NULL DEFAULT 0,
    moves INT UNSIGNED NOT NULL DEFAULT 0,
    time_seconds INT UNSIGNED NOT NULL DEFAULT 0,
    score INT NOT NULL DEFAULT 0,
    won TINYINT(1) NOT NULL DEFAULT 0,
    daily_challenge TINYINT(1) NOT NULL DEFAULT 0,
    player_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_games_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_user_games (user_id, created_at),
    INDEX idx_leaderboard (won, mode, time_seconds)
);
