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
- ペイン内にタブが並ぶ(VSCode 風)。相対の `.md` リンクは新しいタブで開き、× でタブを閉じる。http(s) は `open` で外部ブラウザへ。
- リモート: props に `on`(machine 名)を足すと、その machine のファイルを読む。変更追従は 10 秒ごとの再読み込み。
- 画像(相対パス)は表示されない。未対応。

## Files との連携(`files-md`)

Files(`mod.clone` したもの)から `.md` を選ぶと、同じ herdr の tab に md-viewer があればそのタブへ追加し、なければ分割して作る。
`props.viewer`(Files が付ける ID)と shared(`md-viewer:pane:<pane>` / `md-viewer:open:<viewer>` / `md-viewer:pending`)でペインを特定する。
`run("pane.split")` は新しいペインの ID を返さないため、分割の前後で増えた md-viewer ペインを結び付けている。
