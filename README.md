# Flag Play Studio 5vs5 (FPS 5vs5)

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

## Supported Environment

- Modern desktop browsers: Chrome, Edge, Firefox, Safari
- Mobile browsers: Safari on iOS, Chrome on Android
- Static web serving only: open `index.html` directly in a browser or host the folder with GitHub Pages / any static file host
- Optional file-system access: direct overwrite works in browsers that support the File System Access API, but "Save As" and file import work on all modern browsers via standard file dialogs

## Testing

No automated test suite is included. The recommended validation steps are:

1. Open `index.html` in a desktop browser and verify:
   - tools switch correctly
   - new folder/play creation works
   - routes can be drawn, edited, and cleared
   - JSON export/import works
   - PNG and PDF export functions open correctly
2. Open the same project via GitHub Pages on a desktop browser and verify static hosting works normally.
3. Open the same project via GitHub Pages on a mobile browser and verify tapping, route creation, and file export work as expected.
4. Confirm the app remains functional when switching between tools and when using the save/load work flow.

## Usage Scenarios

- Local browser: open `index.html` directly and use the app without a server
- Desktop GitHub Pages: publish the repository and use the app from the hosted URL
- Mobile GitHub Pages: open the hosted URL on a smartphone for touch-friendly editing

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.


フラッグフットボールのオフェンスプレイ図を作るための静的Webアプリです。

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
