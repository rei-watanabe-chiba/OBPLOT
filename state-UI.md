# 状態管理 (State) と UI更新の連動マトリクス

## 1. システム層 (System Layer)
アプリ全体の制御や非同期通信時のロック状態を管理します。

| 判定対象・トリガー | Stateパス | UIの更新内容 (UIStateUpdater -> DOM) |
| :--- | :--- | :--- |
| **通信中・処理中** | `GLB.isLocked` | `true` の場合、タブ全体 (`tab1Fieldset`) を無効化（ユーザー操作をブロック）。 |
| **タブ切替** | `GLB.activeTab` | 対象のタブコンテンツ (`.tab-content`) とボタン (`.tab-btn`) に `.active` を付与。 |

## 2. 設定・入力層 (Config Layer)
ユーザーからの初期入力やモード選択の妥当性を判定し、UIを制御します。

| 判定対象・トリガー | Stateパス | UIの更新内容 (UIStateUpdater -> DOM) |
| :--- | :--- | :--- |
| **Dataset入力不足** | `Tab1ST.isConfigMapError` | 該当の入力フィールド枠を赤色(`.error`)に変更。抽出ステータスを一時クリア。 |
| **モード(Single/Dual)変更** | `Tab1ST.configExacMode` | ファイル再検証が必要になるため、ファイルステータスを「再検証要求」に変更し、`isFileValidateError` を `true` に強制リセット。 |
| **設定ステータス** | `Tab1ST.configStas` | 設定バー (`configStasBar`) のテキストと色 (success/error等) を更新。 |

## 3. ファイル層 (File Layer)
ファイルデータの取得、列マッピング、バリデーション状態を管理し、後続処理（抽出）の可否を決定します。

| 判定対象・トリガー | Stateパス | UIの更新内容 (UIStateUpdater -> DOM) |
| :--- | :--- | :--- |
| **データ取得 成功/失敗** | `Tab1ST.isFileLoadError` | `false`(成功) の場合、列選択エリア (`fileArea`) を展開し、リスト生成・検証ボタンを表示。設定エリア (`configBox`) を閉じる。 |
| **列選択の未設定/重複** | `Tab1ST.isFileMapError` | エラー対象のセレクトボックスを赤枠化。リスト生成ボタン (`fileMakeBtn`) を無効化。 |
| **ファイルリスト検証結果** | `Tab1ST.isFileValidateError` | `true`(エラー/未検証) の場合、抽出ボタン (`exacBtn`) を無効化。`false` の場合は列選択エリアを閉じ、抽出ボタンを有効化。 |
| **スプレッドシート直接編集** | `Tab1ST.isFileEdited` | `true` の場合、シート変更により整合性が崩れたとみなし、抽出ボタンを無効化。再検証要求のステータスを表示。 |
| **ファイルステータス** | `Tab1ST.fileStas` | ファイルバー (`fileStasBar`) のテキストと色を更新。マッピングエラーがある場合は列選択エリアを強制展開。 |

## 4. 実行・出力層 (Execution Layer)
抽出処理やレポート生成など、最終的なアクションの結果を表示します。

| 判定対象・トリガー | Stateパス | UIの更新内容 (UIStateUpdater -> DOM) |
| :--- | :--- | :--- |
| **抽出・PXRF格納結果** | `Tab1ST.exacStas` | 抽出バー (`exacStasBar`) のテキストと色 (success/error等) を更新。 |
| **レポート生成結果** | `Tab2ST.reportStas` | レポートバー (`reportStasBar`) のテキストと色を更新。 |
