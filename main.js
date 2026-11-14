import { View, div } from "gpui-kit";
import { TextView } from "gpui-base";
import { theme, shared, props, readTextFile, watchFolder, exec } from "herdr";

const dirname = (p) => p.replace(/\/[^/]*$/, "") || "/";
const basename = (p) => p.split("/").pop();

// 相対パスを file のあるフォルダ基準で解決する(. と .. を畳む)。
function resolve(base, rel) {
  const out = rel.startsWith("/") ? [] : base.split("/");
  for (const seg of rel.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop(); else out.push(seg);
  }
  return out.join("/") || "/";
}

const MAX = 400000;

// ペイン内のタブ(VSCode 風)。Files から開くときは shared("md-viewer:open:<viewer>") に {file,on,seq} が書かれる。
export default class extends View {
  init() {
    const p = props() ?? {};
    this.viewer = p.viewer ?? null; // Files がこのペインを特定するための ID
    this.tabs = p.file ? [{ file: p.file, on: p.on ?? null }] : [];
    this.active = 0;
    this.text = null;
    this.error = null;
    this.watching = null;
    this.seq = 0;
    this.started = false;
  }

  get file() { return this.tabs[this.active]?.file ?? null; }
  get on() { return this.tabs[this.active]?.on ?? null; }

  load(cx) {
    if (storybook("md-viewer")) return; // モック中は本番のファイル読み込み・監視をしない
    const file = this.file, on = this.on;
    if (!file) { this.watching = null; this.text = null; this.error = "開いているファイルはありません"; return; }
    cx.spawn(async (cx) => {
      try {
        const t = await readTextFile(file, { on });
        if (this.file !== file || this.on !== on) return;
        if (t === null) { this.text = null; this.error = "ファイルが見つかりません"; }
        else if (t.includes("\0")) { this.text = null; this.error = "バイナリファイルは表示できません"; }
        else { this.text = t.length > MAX ? t.slice(0, MAX) + "\n\n… (長いため省略)" : t; this.error = null; }
      } catch { if (this.file === file) { this.text = null; this.error = "読み込めません"; } }
      cx.notify();
    });
    this.watch(dirname(file), on, cx);
  }

  // ローカルは watchFolder、リモートは 10 秒ごとの再読み込み(Files と同じ方式)。
  watch(dir, on, cx) {
    const token = `${on ?? ""}:${dir}`;
    if (this.watching === token) return;
    this.watching = token;
    cx.spawn(async (cx) => {
      while (this.watching === token) {
        try { if (on) await exec("sleep", ["10"]); else await watchFolder(dir); } catch { return; }
        if (this.watching !== token) return;
        this.load(cx);
      }
    });
  }

  // 同じファイルが開いていればそのタブへ、なければ新しいタブを足して切り替える。
  openTab(file, on, cx) {
    const i = this.tabs.findIndex((t) => t.file === file && t.on === on);
    if (i >= 0) this.active = i; else { this.tabs.push({ file, on }); this.active = this.tabs.length - 1; }
    this.text = null; this.error = null;
    this.load(cx);
    cx.notify();
  }

  select(i, cx) {
    if (i === this.active) return;
    this.active = i;
    this.text = null; this.error = null;
    this.load(cx);
    cx.notify();
  }

  closeTab(i, cx) {
    this.tabs.splice(i, 1);
    this.active = Math.min(this.active > i ? this.active - 1 : this.active, Math.max(this.tabs.length - 1, 0));
    this.text = null; this.error = null;
    this.load(cx);
    cx.notify();
  }

  link(url, cx) {
    if (/^https?:\/\//.test(url)) { exec("open", [url]); return; }
    if (url.startsWith("#") || !this.file) return;
    const path = decodeURIComponent(url.replace(/^file:\/\//, "").split("#")[0]);
    const target = resolve(dirname(this.file), path);
    if (/\.(md|markdown)$/i.test(target)) this.openTab(target, this.on, cx);
    else if (!this.on) exec("open", [target]);
  }

  render(cx) {
    const t = theme(), mock = storybook("md-viewer");
    if (!this.started) { this.started = true; this.load(cx); }
    // Files からの「このペインで開く」依頼を受け取る。
    const req = this.viewer && !mock ? shared(`md-viewer:open:${this.viewer}`) : null;
    if (req && req.seq > this.seq) { this.seq = req.seq; this.openTab(req.file, req.on ?? null, cx); }

    const view = mock ? MOCK_DOCS[mock.doc ?? "sample"] ?? MOCK_DOCS.sample : { text: this.text, error: this.error };
    const names = mock ? (mock.tabs === "many" ? MOCK_TABS : ["sample.md"]) : this.tabs.map((x) => basename(x.file));
    const active = mock ? (mock.tabs === "many" ? 1 : 0) : this.active;
    const pad = mock?.compact ? 8 : 16;

    return div().id("md-viewer").size_full().min_h(0).flex().flex_col().bg(t.surface).text_color(t.foreground)
      .child(div().id("md-tabs").flex().flex_row().h(34).flex_none().overflow_x_scroll().border_b(1).border_color(t.border)
        .children(names.map((name, i) => div().id(`md-tab-${i}`).flex().flex_row().flex_none().items_center().gap(6).h_full().pl(12).pr(6).max_w(200)
          .cursor_pointer().text_size(12).border_r(1).border_color(t.border)
          .bg(i === active ? t.surface : t.chrome).text_color(i === active ? t.foreground : t.muted)
          .when(i === active, (el) => el.border_b(2).border_color(t.accent))
          .on_click((_e, cx) => !mock && this.select(i, cx))
          .child(div().min_w(0).truncate().child(name))
          .child(div().id(`md-close-${i}`).w(18).h(18).flex().items_center().justify_center().rounded(4).text_color(t.dim)
            .hover((s) => s.bg(t.hover))
            .on_click((e, cx) => { e.stopPropagation?.(); if (!mock) this.closeTab(i, cx); })
            .child("×")))))
      .child(view.error
        ? div().p(pad).text_color(t.dim).child(view.error)
        : div().id("md-scroll").flex_1().min_h(0).overflow_y_scrollbar().p(pad)
            .child(TextView.markdown("md-body", view.text ?? "").selectable(true).on_link_click((url, cx) => this.link(url, cx))));
  }
}

// ===== STORYBOOK MOCK =====
// モック中(Story が開いたプレビュー)は選択値、本番なら null (STORYBOOK.md §3 の正本)。
export function storybook(mod) {
  const id = props()?.storybook;
  return id ? (shared(`storybook:${mod}:${id}`)?.values ?? {}) : null;
}

const LONG = "とても長い行 ".repeat(60);
const MOCK_TABS = ["README.md", "TASKS.md", "very-long-document-name-for-testing.md", "notes.md"];
const MOCK_DOCS = {
  sample: { text: "# 見出し1\n\n本文。**太字** と *斜体* と `code`。\n\n- 項目A\n- 項目B\n\n> 引用文\n\n[相対リンク](./other.md) / [外部](https://example.com)\n\n![画像](./img.png)\n" },
  table: { text: "| 名前 | 値 | 説明 |\n|---|---|---|\n| a | 1 | 最初 |\n| b | 2 | 二番目 |\n| c | 3 | " + LONG + " |\n" },
  code: { text: "```js\nconst x = 1;\nfunction hello() {\n  return 'world';\n}\n```\n\n```sh\necho " + "very-long-token-".repeat(20) + "\n```\n" },
  long: { text: Array.from({ length: 40 }, (_, i) => `## 節 ${i + 1}\n\n${LONG}\n`).join("\n") },
  empty: { text: "" },
  error: { error: "ファイルが見つかりません" },
};
