import mysql from "mysql2/promise";
import { config } from "../config/index.js";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      database: config.mysql.database,
      user: config.mysql.user,
      password: config.mysql.password,
      waitForConnections: true,
      connectionLimit: 10,
      timezone: "+00:00",
    });
  }
  return pool;
}

// ============================================================
// Schema Migration
// ============================================================

export async function runMigrations(): Promise<void> {
  const conn = await getPool().getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL,
        analysis_type VARCHAR(50) NOT NULL,
        rule_engine_result JSON NOT NULL,
        ai_interpretation TEXT,
        user_address VARCHAR(42) DEFAULT NULL,
        exchange VARCHAR(20) DEFAULT 'hyperliquid',
        side VARCHAR(10) DEFAULT NULL,
        leverage INT DEFAULT NULL,
        entry_price DECIMAL(30,8) DEFAULT NULL,
        mark_price DECIMAL(30,8) DEFAULT NULL,
        llm_model VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add columns if table already exists (compatible with MySQL < 8.0.37)
    const newCols = [
      { name: 'user_address', def: 'VARCHAR(42) DEFAULT NULL' },
      { name: 'exchange', def: "VARCHAR(20) DEFAULT 'hyperliquid'" },
      { name: 'side', def: 'VARCHAR(10) DEFAULT NULL' },
      { name: 'leverage', def: 'INT DEFAULT NULL' },
      { name: 'entry_price', def: 'DECIMAL(30,8) DEFAULT NULL' },
      { name: 'mark_price', def: 'DECIMAL(30,8) DEFAULT NULL' },
      { name: 'llm_model', def: 'VARCHAR(100) DEFAULT NULL' },
    ];
    for (const col of newCols) {
      const [rows] = await conn.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'analysis_history' AND COLUMN_NAME = ?`,
        [config.mysql.database, col.name],
      );
      const exists = (rows as Array<{ cnt: number }>)[0]?.cnt > 0;
      if (!exists) {
        await conn.query(`ALTER TABLE analysis_history ADD COLUMN ${col.name} ${col.def}`).catch(() => {});
      }
    }
    await conn.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_symbol_time
      ON analysis_history(symbol, created_at DESC)
    `).catch(() => {});

    await conn.query(`
      CREATE TABLE IF NOT EXISTS funding_rate_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        coin VARCHAR(20) NOT NULL,
        rate DECIMAL(18, 10) NOT NULL,
        recorded_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE INDEX IF NOT EXISTS idx_funding_coin_time
      ON funding_rate_history(coin, recorded_at DESC)
    `).catch(() => {});

    await conn.query(`
      CREATE TABLE IF NOT EXISTS oi_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        coin VARCHAR(20) NOT NULL,
        open_interest DECIMAL(30, 8) NOT NULL,
        price DECIMAL(30, 8) NOT NULL,
        recorded_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await conn.query(`
      CREATE INDEX IF NOT EXISTS idx_oi_coin_time
      ON oi_history(coin, recorded_at DESC)
    `).catch(() => {});

    await conn.query(`
      CREATE TABLE IF NOT EXISTS discover_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recommendations JSON NOT NULL,
        llm_model VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    conn.release();
  }
}

// ============================================================
// Repository Functions
// ============================================================

export interface AnalysisExtra {
  userAddress?: string;
  exchange?: string;
  side?: string;
  leverage?: number;
  entryPrice?: number;
  markPrice?: number;
  llmModel?: string;
}

export async function saveAnalysisResult(
  symbol: string,
  analysisType: string,
  ruleEngineResult: unknown,
  aiInterpretation: string | null,
  extra?: AnalysisExtra,
): Promise<void> {
  try {
    await getPool().execute(
      `INSERT INTO analysis_history
       (symbol, analysis_type, rule_engine_result, ai_interpretation, user_address, exchange, side, leverage, entry_price, mark_price, llm_model)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        symbol,
        analysisType,
        JSON.stringify(ruleEngineResult),
        aiInterpretation,
        extra?.userAddress ?? null,
        extra?.exchange ?? "hyperliquid",
        extra?.side ?? null,
        extra?.leverage ?? null,
        extra?.entryPrice ?? null,
        extra?.markPrice ?? null,
        extra?.llmModel ?? null,
      ],
    );
  } catch (err) {
    console.error("Failed to save analysis result:", err);
  }
}

export async function saveFundingRate(coin: string, rate: number, recordedAt: Date): Promise<void> {
  try {
    await getPool().execute(
      `INSERT INTO funding_rate_history (coin, rate, recorded_at) VALUES (?, ?, ?)`,
      [coin, rate, recordedAt],
    );
  } catch (err) {
    console.error("Failed to save funding rate:", err);
  }
}

export async function saveOIData(coin: string, oi: number, price: number, recordedAt: Date): Promise<void> {
  try {
    await getPool().execute(
      `INSERT INTO oi_history (coin, open_interest, price, recorded_at) VALUES (?, ?, ?, ?)`,
      [coin, oi, price, recordedAt],
    );
  } catch (err) {
    console.error("Failed to save OI data:", err);
  }
}

export async function getFundingRateHistory(coin: string, days: number): Promise<Array<{ rate: number; recorded_at: Date }>> {
  try {
    const [rows] = await getPool().execute(
      `SELECT rate, recorded_at FROM funding_rate_history
       WHERE coin = ? AND recorded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       ORDER BY recorded_at ASC`,
      [coin, String(days)],
    );
    return (rows as Array<{ rate: string; recorded_at: Date }>).map((r) => ({
      rate: parseFloat(r.rate),
      recorded_at: r.recorded_at,
    }));
  } catch (err) {
    console.error("Failed to get funding history:", err);
    return [];
  }
}

export async function getOIHistory(coin: string, limit: number = 2): Promise<Array<{ open_interest: number; price: number; recorded_at: Date }>> {
  try {
    const [rows] = await getPool().execute(
      `SELECT open_interest, price, recorded_at FROM oi_history
       WHERE coin = ? ORDER BY recorded_at DESC LIMIT ?`,
      [coin, String(limit)],
    );
    return (rows as Array<{ open_interest: string; price: string; recorded_at: Date }>).map((r) => ({
      open_interest: parseFloat(r.open_interest),
      price: parseFloat(r.price),
      recorded_at: r.recorded_at,
    }));
  } catch (err) {
    console.error("Failed to get OI history:", err);
    return [];
  }
}

export async function saveDiscoverResult(recommendations: unknown, llmModel?: string): Promise<void> {
  try {
    await getPool().execute(
      `INSERT INTO discover_history (recommendations, llm_model) VALUES (?, ?)`,
      [JSON.stringify(recommendations), llmModel ?? null],
    );
  } catch (err) {
    console.error("Failed to save discover result:", err);
  }
}
