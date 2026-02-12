// src/app/api/admin/staff/import-schedule/route.ts
// CSV シフトインポートAPI

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDate } from "@/lib/date-utils";

interface CsvRow {
  row: number;
  status: "ok" | "error" | "warning";
  staffName: string;
  staffId?: string;
  date: string;
  startTime: string;
  endTime: string;
  error?: string;
  warning?: string;
  corrections?: string[];
}

interface ImportResult {
  preview: boolean;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  rows: CsvRow[];
}

// ヘッダー名の揺れ対応マッピング
const STAFF_NAME_HEADERS = ["スタッフ名", "名前", "担当者", "スタイリスト", "staff", "name"];
const DATE_HEADERS = ["日付", "date", "日", "勤務日"];
const START_TIME_HEADERS = ["開始時間", "開始", "出勤", "start", "start_time", "from"];
const END_TIME_HEADERS = ["終了時間", "終了", "退勤", "end", "end_time", "to"];

function findHeaderIndex(headers: string[], candidates: string[]): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = normalized.indexOf(candidate.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * 全角数字を半角に変換
 */
function toHalfWidth(str: string): string {
  return str.replace(/[０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xfee0)
  );
}

/**
 * 日付文字列を YYYY-MM-DD に正規化
 * 対応形式: YYYY-MM-DD, YYYY/MM/DD, YYYY/M/D, MM/DD/YYYY
 */
function normalizeDate(raw: string): { date: string; correction?: string } | { error: string } {
  const s = toHalfWidth(raw.trim());

  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const m = isoMatch[2].padStart(2, "0");
    const d = isoMatch[3].padStart(2, "0");
    const normalized = `${isoMatch[1]}-${m}-${d}`;
    if (normalized !== s) {
      return { date: normalized, correction: `日付を${normalized}に補正` };
    }
    return { date: normalized };
  }

  // YYYY/MM/DD or YYYY/M/D
  const slashMatch = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (slashMatch) {
    const m = slashMatch[2].padStart(2, "0");
    const d = slashMatch[3].padStart(2, "0");
    return { date: `${slashMatch[1]}-${m}-${d}`, correction: `日付を${slashMatch[1]}-${m}-${d}に補正` };
  }

  // MM/DD/YYYY
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const m = usMatch[1].padStart(2, "0");
    const d = usMatch[2].padStart(2, "0");
    return { date: `${usMatch[3]}-${m}-${d}`, correction: `日付を${usMatch[3]}-${m}-${d}に補正` };
  }

  return { error: `日付の形式が不正です「${raw}」` };
}

/**
 * 時間文字列を HH:MM に正規化
 * 対応形式: HH:MM, H:MM, HH:MM:SS, H時MM分
 */
function normalizeTime(raw: string, label: string): { time: string; correction?: string } | { error: string } {
  const s = toHalfWidth(raw.trim());

  // HH:MM or H:MM
  const colonMatch = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colonMatch) {
    const h = colonMatch[1].padStart(2, "0");
    const normalized = `${h}:${colonMatch[2]}`;
    if (normalized !== s) {
      return { time: normalized, correction: `${label}を${normalized}に補正` };
    }
    return { time: normalized };
  }

  // H時MM分
  const jpMatch = s.match(/^(\d{1,2})時(\d{2})分?$/);
  if (jpMatch) {
    const h = jpMatch[1].padStart(2, "0");
    const normalized = `${h}:${jpMatch[2]}`;
    return { time: normalized, correction: `${label}を${normalized}に補正` };
  }

  return { error: `${label}の形式が不正です「${raw}」` };
}

/**
 * Shift_JIS を検出して適切にデコード
 */
function decodeCSVBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // BOM チェック (UTF-8 BOM: EF BB BF)
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes);
  }

  // UTF-8 として試す
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return text;
  } catch {
    // Shift_JIS にフォールバック
    try {
      return new TextDecoder("shift_jis").decode(bytes);
    } catch {
      // 最終フォールバック
      return new TextDecoder("utf-8").decode(bytes);
    }
  }
}

/**
 * CSV文字列をパースする (カンマ区切り、クォート対応)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

// POST /api/admin/staff/import-schedule
export async function POST(request: NextRequest) {
  const { error } = await checkAdminAuth();
  if (error) return error;

  try {
    const isPreview = request.nextUrl.searchParams.get("preview") === "true";
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 });
    }

    // ファイルサイズチェック (1MB)
    if (file.size > 1024 * 1024) {
      return NextResponse.json({ error: "ファイルサイズが大きすぎます（1MB以下）" }, { status: 400 });
    }

    // 拡張子チェック
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "CSVファイルを選択してください" }, { status: 400 });
    }

    // CSV デコード
    const buffer = await file.arrayBuffer();
    const text = decodeCSVBuffer(buffer);

    // 行に分割 (CR+LF / LF 両対応)
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: "CSVにデータ行がありません" }, { status: 400 });
    }

    // ヘッダー解析
    const headers = parseCSVLine(lines[0]);
    const staffNameIdx = findHeaderIndex(headers, STAFF_NAME_HEADERS);
    const dateIdx = findHeaderIndex(headers, DATE_HEADERS);
    const startTimeIdx = findHeaderIndex(headers, START_TIME_HEADERS);
    const endTimeIdx = findHeaderIndex(headers, END_TIME_HEADERS);

    const missingHeaders: string[] = [];
    if (staffNameIdx === -1) missingHeaders.push("スタッフ名");
    if (dateIdx === -1) missingHeaders.push("日付");
    if (startTimeIdx === -1) missingHeaders.push("開始時間");
    if (endTimeIdx === -1) missingHeaders.push("終了時間");

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        { error: `必須列が見つかりません: ${missingHeaders.join(", ")}` },
        { status: 400 }
      );
    }

    // DBからスタッフ名のマッピングを取得
    const allStaff = await prisma.staff.findMany({
      select: { id: true, name: true },
    });
    const staffNameMap = new Map<string, { id: string; name: string }>();
    for (const s of allStaff) {
      // 空白を除去した名前でもマッチ
      staffNameMap.set(s.name, s);
      staffNameMap.set(s.name.replace(/\s/g, ""), s);
    }

    // 各行をバリデーション
    const rows: CsvRow[] = [];
    const seen = new Map<string, number>(); // 重複検知用: "staffId-date" -> row

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const rowNum = i + 1;

      const rawName = cols[staffNameIdx] || "";
      const rawDate = cols[dateIdx] || "";
      const rawStart = cols[startTimeIdx] || "";
      const rawEnd = cols[endTimeIdx] || "";

      // 空行スキップ
      if (!rawName && !rawDate && !rawStart && !rawEnd) continue;

      const corrections: string[] = [];
      let hasError = false;
      let errorMsg = "";

      // スタッフ名チェック
      const trimmedName = rawName.trim();
      const staff = staffNameMap.get(trimmedName) || staffNameMap.get(trimmedName.replace(/\s/g, ""));
      if (!staff) {
        hasError = true;
        errorMsg = `「${trimmedName}」は登録されていません`;
      }

      // 日付チェック
      let dateStr = "";
      const dateResult = normalizeDate(rawDate);
      if ("error" in dateResult) {
        hasError = true;
        errorMsg = errorMsg || dateResult.error;
      } else {
        dateStr = dateResult.date;
        if (dateResult.correction) corrections.push(dateResult.correction);
      }

      // 開始時間チェック
      let startTime = "";
      const startResult = normalizeTime(rawStart, "開始時間");
      if ("error" in startResult) {
        hasError = true;
        errorMsg = errorMsg || startResult.error;
      } else {
        startTime = startResult.time;
        if (startResult.correction) corrections.push(startResult.correction);
      }

      // 終了時間チェック
      let endTime = "";
      const endResult = normalizeTime(rawEnd, "終了時間");
      if ("error" in endResult) {
        hasError = true;
        errorMsg = errorMsg || endResult.error;
      } else {
        endTime = endResult.time;
        if (endResult.correction) corrections.push(endResult.correction);
      }

      // 終了時間 > 開始時間チェック
      if (!hasError && startTime && endTime && endTime <= startTime) {
        hasError = true;
        errorMsg = "終了時間が開始時間より前です";
      }

      // 重複チェック
      if (!hasError && staff) {
        const key = `${staff.id}-${dateStr}`;
        const prevRow = seen.get(key);
        if (prevRow) {
          corrections.push(`行${prevRow}と重複（この行で上書き）`);
          // 前の行を上書きする
          const prevIdx = rows.findIndex((r) => r.row === prevRow && r.staffId === staff.id && r.date === dateStr);
          if (prevIdx !== -1) {
            rows[prevIdx] = {
              ...rows[prevIdx],
              status: "warning",
              warning: `行${rowNum}で上書きされました`,
            };
          }
        }
        seen.set(key, rowNum);
      }

      if (hasError) {
        rows.push({
          row: rowNum,
          status: "error",
          staffName: trimmedName,
          date: dateStr || rawDate,
          startTime: startTime || rawStart,
          endTime: endTime || rawEnd,
          error: errorMsg,
        });
      } else {
        rows.push({
          row: rowNum,
          status: corrections.length > 0 ? "warning" : "ok",
          staffName: staff!.name,
          staffId: staff!.id,
          date: dateStr,
          startTime,
          endTime,
          warning: corrections.length > 0 ? corrections.join("; ") : undefined,
          corrections: corrections.length > 0 ? corrections : undefined,
        });
      }
    }

    const result: ImportResult = {
      preview: isPreview,
      totalRows: rows.length,
      validRows: rows.filter((r) => r.status !== "error").length,
      errorRows: rows.filter((r) => r.status === "error").length,
      warningRows: rows.filter((r) => r.status === "warning").length,
      rows,
    };

    // プレビューモード: バリデーション結果のみ返す
    if (isPreview) {
      return NextResponse.json(result);
    }

    // 確定モード: エラー行がある場合は拒否
    if (result.errorRows > 0) {
      return NextResponse.json(
        { error: "エラーのある行があります。修正してから再度インポートしてください", ...result },
        { status: 400 }
      );
    }

    // DB に反映 (StaffScheduleOverride に upsert)
    const validRows = rows.filter((r) => r.status !== "error" && r.staffId);

    // 上書きされた行を除外
    const finalRows = new Map<string, CsvRow>();
    for (const row of validRows) {
      if (row.warning?.includes("上書きされました")) continue;
      const key = `${row.staffId}-${row.date}`;
      finalRows.set(key, row);
    }

    await prisma.$transaction(async (tx) => {
      for (const row of finalRows.values()) {
        const date = parseLocalDate(row.date);
        await tx.staffScheduleOverride.upsert({
          where: {
            staffId_date: { staffId: row.staffId!, date },
          },
          update: {
            startTime: row.startTime,
            endTime: row.endTime,
          },
          create: {
            staffId: row.staffId!,
            date,
            startTime: row.startTime,
            endTime: row.endTime,
          },
        });
      }
    });

    return NextResponse.json({
      ...result,
      message: `${finalRows.size}件のシフトを反映しました`,
    });
  } catch (err) {
    console.error("CSV import error:", err);
    return NextResponse.json(
      { error: "CSVインポートに失敗しました" },
      { status: 500 }
    );
  }
}
