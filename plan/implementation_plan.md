# 実装計画書 (改訂版): GAS_to_GitHub.bat 改行コード修正

## 根本原因
ファイルの改行コードが LF (Unix形式, 0x0A) になっている。
Windows の cmd.exe はラベルスキャン時に CRLF (0x0D 0x0A) のみを改行として認識するため、
LF のみの行末では `:END_PROMPT` が「行頭」として認識されずラベル検索が失敗する。

## 対象ファイル
`C:\LLMdict\gemini\OBPLOT_env\onlyUser\GAS_to_GitHub.bat`

## 修正内容
ファイル全体の改行コードを LF → CRLF に変換して上書き保存する。

## 実装手順（PowerShell で実行）

```powershell
$path = 'C:\LLMdict\gemini\OBPLOT_env\onlyUser\GAS_to_GitHub.bat'
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
$crlf = $content -replace '(?<!\r)\n', "`r`n"
[System.IO.File]::WriteAllText($path, $crlf, [System.Text.Encoding]::UTF8)
Write-Host "Done. CRLF conversion complete."
```

## スコープ
- 対象: GAS_to_GitHub.bat のみ
- ソースコードロジックの変更: なし（改行コード変換のみ）
- ソースコードの行数・内容は変わらない
