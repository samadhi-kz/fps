# Flag Play Studio

An interactive web-based tool for designing and visualizing flag football plays.

## Features

- Draw and edit football plays with routes, motions, passes, and blocks
- Customize player markers (light blue circles, red stars, yellow diamonds, green squares)
- Adjust player size and end cap size
- Save and load plays as JSON
- Export plays as SVG or PDF
- Manage playbooks with folders and multiple plays
- Responsive canvas with snap-to-grid option

## Usage

1. Open the application in a web browser
2. Create new plays and organize them into folders
3. Use the drawing tools to add routes and annotations
4. Customize player markers and sizes
5. Save your playbook as JSON for later editing
6. Export plays as SVG or PDF for sharing and printing

## Tools

- **Select**: Select and move elements on the field
- **Route**: Draw player routes
- **Motion**: Draw motion routes (zigzag pattern)
- **Pass**: Draw pass routes (dashed)
- **Block**: Draw block assignments
- **Comment**: Add text annotations

## Player Marks

- Light Blue Circle (default)
- Red Star
- Yellow Diamond
- Green Square

## File Format

Playbooks are saved as JSON and can be easily backed up, shared, or version controlled.

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.


PDFのようなフラッグフットボールのオフェンスプレイ図を作るための静的Webアプリです。

## 使い方

`index.html` をブラウザで開くと動きます。

- 選択ツールで選手や守備Xをドラッグ
- ルート、モーション、パス、ブロックを選んで、選手からドラッグして線を作成
- 線を選択してドラッグすると線全体を移動
- 青い点をドラッグするとルートを調整、黄色い点をドラッグすると中間点を追加
- Text ツールでプレイ内にコメントを書き込み
- 赤星は なし / 1-5 から切り替え
- 線を全消去でルートをまとめてクリア
- Folder と Play でプレイブックを整理してブラウザに保存
- PDF ボタンで印刷ダイアログを開き、PDFとして保存
- SVG と Backup でファイル出力
- 5v5固定のため、選手と守備Xは常に5人ずつです
