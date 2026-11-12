# md-viewer のやること

決まりごと: 親の `~/Projects/herdr-mods/CLAUDE.md`(Story 契約 v2: モックと `storybook()` は `main.js` 内、`./mock.js` は作らない。
同梱 Mod / layout は直接編集せず `mod.clone` / `layout.clone` で複製してから触る)。

## 1. Markdown を表示する Mod

- `props {file}` で受け取り、ペインに描画する。`pane.split {direction: "right", mod: "md-viewer", props: {file}}` で開ける。
- 描画は AGENTS.md の `TextView.markdown(id, text)` が使える。
- ファイルの変更に追従する(`watchFolder` かタイマー)。
- 崩れやすい要素を確認する: 表、コードブロック、画像、相対リンク、長い行。
- `storybook.json` に状態(例: 文書サンプル、テーマ)を列挙し、モックを `main.js` 内に作る。

## 2. 同梱 Files への反映を「検討」する(実装の前に、案と推奨をユーザーに報告)

候補:
- (a) 同梱 `files` を `mod.clone` し、`.md` を開いたときだけ Editor ではなく Markdown 描画にする。
- (b) clone した `files` から、`.md` を `pane.split {mod: "md-viewer", props: {file}}` で開く。
- (c) ソース表示とプレビューを切り替えられるようにする。

調べること: `~/.config/herdr-app/mods/files/main.js` の「ファイルを開く」処理、レイアウトが `files` をどう参照しているか
(`content.mod`)。必要な変更点・影響範囲・リスクを整理する。

## 進め方
- 変更後は `herdr-app check` と `herdr-app shot`(自分の space を選んでから)で確認する。
- 画面の挙動が変わる操作(layout 切替、Files の差し替えなど)は、実行前に報告する。
