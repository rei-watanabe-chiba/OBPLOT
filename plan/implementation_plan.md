# 実装計画書: GAS_to_GitHub.bat バグ修正

## 目的
`call clasp push/pull` がネストされた `.cmd` 呼び出しによって
バッチパーサー状態を汚染し、`goto END_PROMPT` が失敗する問題を修正する。

## 対象ファイル
`C:\LLMdict\gemini\OBPLOT_env\onlyUser\GAS_to_GitHub.bat`

---

## 変更箇所 (3箇所)

### 修正1: Line 77 — PUSH_DEV セクション内の clasp push

**変更前:**
```
call clasp push
```

**変更後:**
```
cmd /c clasp push
```

---

### 修正2: Line 89 — PULL_GAS セクション内の clasp pull

**変更前:**
```
call clasp pull
```

**変更後:**
```
cmd /c clasp pull
```

---

### 修正3: Line 111 — PUSH_MAIN セクション内の clasp push

**変更前:**
```
call clasp push
```

**変更後:**
```
cmd /c clasp push
```

---

## 修正の根拠
`cmd /c <外部コマンド>` は別 cmd.exe プロセスとして実行されるため、
clasp.cmd 内部のバッチパーサー状態が親バッチファイルに波及しない。
`call clasp push` のような同プロセス内ネスト呼び出しと異なり、
親バッチの `goto` ラベル検索に干渉しない。

## スコープ外（変更しない）
- `call :CLEAN_GITIGNORE` はバッチ内部サブルーチンのため変更不要
- `:END_PROMPT` ラベル自体の構造変更は不要
- ANSIエスケープコードは現状維持（Windows Terminal環境では正常動作）
