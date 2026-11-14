# md-viewer

Markdown を Herdr のペインで表示する Mod。ファイルを props で受け取って描画する。
将来は、同梱 `files` の複製(Files パネル)から Markdown を開いたときに、この表示を使えるか検討する。

## 導入

    git clone git@github.com:naoto-anzai/md-viewer.git ~/Projects/herdr-mods/md-viewer
    sh ~/Projects/herdr-mods/mods-watcher/sync.sh ~/Projects/herdr-mods/md-viewer ~/.config/herdr-app/mods/md-viewer

(mods-watcher を使わないなら `ln -s` で `~/.config/herdr-app/mods/md-viewer` に張る。ホットリロードは効かない。)

## 使い方

    herdr-app do pane.split '{"direction":"right","mod":"md-viewer","props":{"file":"/abs/path/to/file.md"}}'

- `TextView.markdown` で描画(表・コードブロック・長い行は確認済み)。
- 表示中ファイルのフォルダを `watchFolder` で監視し、変更に追従する。
- 相対の `.md` リンクはペイン内で開き、`←` で戻る。http(s) は `open` で外部ブラウザへ。
- 画像(相対パス)は表示されない。未対応。
