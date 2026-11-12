# md-viewer

Markdown を Herdr のペインで表示する Mod。ファイルを props で受け取って描画する。
将来は、同梱 `files` の複製(Files パネル)から Markdown を開いたときに、この表示を使えるか検討する。

## 導入

    git clone git@github.com:naoto-anzai/md-viewer.git ~/Projects/herdr-mods/md-viewer
    sh ~/Projects/herdr-mods/mods-watcher/sync.sh ~/Projects/herdr-mods/md-viewer ~/.config/herdr-app/mods/md-viewer

(mods-watcher を使わないなら `ln -s` で `~/.config/herdr-app/mods/md-viewer` に張る。ホットリロードは効かない。)

## 状態

雛形のみ。実装はこれから。
