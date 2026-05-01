# Flag Play Studio 5vs5 (FPS 5vs5)

Flag Play Studio 5vs5 is a static web app for drawing, organizing, saving, and exporting 5-on-5 flag football play diagrams.

Open `index.html` in a browser and start designing. No build step or server is required.

## Project Structure

- `index.html`: App shell and SVG layer markup
- `styles.css`: Layout, controls, field, and print styles
- `js/config.js`: Constants, default play data, shared state, and DOM references
- `js/model.js`: Data normalization, snapshots, active-play syncing, and initial state
- `js/playbook-tree.js`: Playbook tree rendering, drag/drop, and tree event handlers
- `js/drawing.js`: SVG geometry, field drawing, player marks, text, and render orchestration
- `js/field-interactions.js`: Pointer interactions, line editing, selection deletion, flip, and clear actions
- `js/files.js`: JSON load/save, PNG export, and PDF/print export
- `js/playbook-actions.js`: Folder/play CRUD and selection behavior
- `js/main.js`: Browser event binding and app startup

## Features

- Draw 5-on-5 flag football plays on a field diagram
- Move offense players, defense markers, routes, route points, and text annotations
- Draw route, motion, pass, and block lines from offensive players
- Start drawing tools from an offensive player or from any open point on the field
- Draw freehand routes and smooth curved routes from offensive players
- Click from a player to place route points one by one, then press Enter or double-click to finish
- Add common route presets such as Go, Out, In, Slant, Post, Corner, Curl, Motion, and Block
- Use a mobile-friendly canvas-first layout with a larger fixed bottom tool dock
- Edit route points with handles and add intermediate points
- Customize line color, line width, line opacity, end cap type, and end cap size
- Keep offensive player numbers visible by rendering players above drawn lines
- Add play-level notes that appear on the right side of the field
- Mark offensive players with circle, star, diamond, or square markers
- Manage playbooks with folders and multiple plays
- Reorder folders and plays by drag and drop
- Move plays between folders, including moving the last play out of a folder
- Keep empty folders and collapse or expand any folder
- Save and load playbooks as JSON files
- Export the current play as PNG
- Print or save the current play as PDF
- Print or save the full playbook as a multi-page PDF

## Usage

1. Open `index.html` in a browser.
2. Use `+ Folder` and `+ Play` to organize a playbook.
3. Drag folders or plays in the tree to reorder them.
4. Drag a play onto another folder to move it there.
5. Select a drawing tool, then drag from an offensive player or anywhere on the field to create a line.
6. Click an offensive player instead of dragging to place route points one by one; press Enter or double-click to finish.
7. Use Draw for freehand routes, or choose Curve/Drawn in Shape for smoother route paths.
8. Select a player and click a preset button to add a common route instantly.
9. Select a line to change its end cap, color, width, opacity, shape, or points.
10. Add notes in `Play Notes`; they appear on the right side of the diagram.
11. Use `Save As` to download a JSON playbook file.
12. Use `Open JSON` to load a saved playbook.
13. Use `PNG`, `PDF Play`, or `PDF Book` for sharing and printing.

On phones, the field is shown first and the main drawing tools stay in the bottom dock with larger tap targets. The dock also includes a Done button for point-by-point line entry and a delete button for the selected line or comment. Detailed drawing and selection controls appear before playbook management, saving, and export actions below the field.

## Tools

- **Select**: Select, move, and edit items on the field
- **Route**: Draw a standard route line
- **Draw**: Draw a freehand route that is simplified and rendered smoothly
- **Motion**: Draw a zigzag motion line
- **Pass**: Draw a dashed pass line
- **Block**: Draw a block line with a T end cap
- **Comment**: Add text annotations on the field

Route and Draw default to arrow endings. Motion and Pass default to dot endings. Block defaults to a T ending.

## Playbook Tree

The playbook tree supports folders and plays. Folders can be empty, collapsed, expanded, reordered, renamed, and deleted. Plays can be reordered inside a folder or moved between folders by drag and drop.

Double-click a folder or play name to rename it.

## Saving

Playbooks are saved as JSON files.

- `Open JSON` loads an existing playbook file.
- `Save As` downloads the current playbook as a JSON file.
- `Overwrite Save` writes directly to the opened file only in browsers that support direct file-system write access.

Safari does not support direct overwrite for local files in this app, so `Overwrite Save` is disabled there. Use `Save As` instead.

## Exporting

- `PNG` exports the current play as an image.
- `PDF Play` opens the browser print dialog for the current play.
- `PDF Book` opens the browser print dialog for every play in the playbook, one play per page.

Use the browser print dialog's "Save as PDF" option when you want a PDF file.

## Notes

- The app is fixed to 5 offensive players and 5 defense markers.
- Work is kept in the current browser session until you save it as JSON.
- JSON files can be backed up, shared, or version controlled.

## License

This project is licensed under the MIT License.

## 日本語まとめ

5vs5 フラッグフットボール用のプレイ作成ツールです。`index.html` をブラウザで開くだけで使えます。フォルダとプレイはドラッグで並べ替え・移動でき、空フォルダもOKです。線の色・太さ・透明度を変えられ、手描きルート、曲線ルート、クリック式の折れ点入力、よく使うルートプリセットにも対応しています。スマホではフィールドを先に表示し、画面下の固定ツールバーから主要ツールを大きめのタップ領域で操作できます。詳細な線・選択設定はフィールド下に優先表示されます。保存はJSON、出力はPNG、現在のプレイPDF、プレイブック全体PDFに対応しています。Safariでは直接上書き保存ができないため、`Save As` を使ってください。
