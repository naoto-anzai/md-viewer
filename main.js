import { View, div } from "gpui-kit";
import { TextView } from "gpui-base";
import { theme, shared, props, readTextFile, watchFolder, exec } from "herdr";

const dirname = (p) => p.replace(/\/[^/]*$/, "") || "/";

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

export default class extends View {
  init() {
    this.file = props()?.file ?? null;
    this.on = props()?.on ?? null; // リモート machine 名(この computer なら null)
    this.history = [];
    this.text = null;
    this.error = null;
    this.watching = null;
    this.started = false;
  }

  load(cx) {
    const file = this.file, mock = storybook("md-viewer");
    if (mock) return; // モック中は本番のファイル読み込み・監視をしない
    if (!file) { this.text = null; this.error = "props.file が指定されていません"; return; }
    cx.spawn(async (cx) => {
      try {
        const t = await readTextFile(file, { on: this.on });
        if (this.file !== file) return;
        if (t === null) { this.text = null; this.error = "ファイルが見つかりません"; }
        else if (t.includes("\0")) { this.text = null; this.error = "バイナリファイルは表示できません"; }
        else { this.text = t.length > MAX ? t.slice(0, MAX) + "\n\n… (長いため省略)" : t; this.error = null; }
      } catch { if (this.file === file) { this.text = null; this.error = "読み込めません"; } }
      cx.notify();
    });
    this.watch(dirname(file), cx);
  }

  // リモートでは watchFolder が使えないので、10 秒ごとに読み直す(Files と同じ方式)。
  poll(token, cx) {
    cx.spawn(async (cx) => {
      while (this.watching === token) {
        try { await exec("sleep", ["10"]); } catch { return; }
        if (this.watching !== token) return;
        this.load(cx);
      }
    });
  }

  // 表示中ファイルのフォルダを監視し、変更があれば読み直す。
  watch(dir, cx) {
    const token = `${this.on ?? ""}:${dir}`;
    if (this.watching === token) return;
    this.watching = token;
    if (this.on) return this.poll(token, cx);
    cx.spawn(async (cx) => {
      while (this.watching === token) {
        try { await watchFolder(dir); } catch { return; }
        if (this.watching !== token) return;
        this.load(cx);
      }
    });
  }

  open(file, cx) {
    this.history.push(this.file);
    this.file = file;
    this.load(cx);
    cx.notify();
  }

  back(cx) {
    const prev = this.history.pop();
    if (!prev) return;
    this.file = prev;
    this.load(cx);
    cx.notify();
  }

  link(url, cx) {
    if (/^https?:\/\//.test(url)) { exec("open", [url]); return; }
    if (url.startsWith("#") || !this.file) return;
    const path = decodeURIComponent(url.replace(/^file:\/\//, "").split("#")[0]);
    const target = resolve(dirname(this.file), path);
    if (/\.(md|markdown)$/i.test(target)) this.open(target, cx);
    else if (!this.on) exec("open", [target]);
  }

  render(cx) {
    if (!this.started) { this.started = true; this.load(cx); }
    const t = theme(), mock = storybook("md-viewer");
    const state = mock ? MOCK[mock.doc ?? "sample"] ?? MOCK.sample : { text: this.text, error: this.error };
    const name = mock ? "sample.md" : this.file?.split("/").pop() ?? "";
    const pad = mock?.compact ? 8 : 16;
    return div().id("md-viewer").size_full().min_h(0).flex().flex_col().bg(t.surface).text_color(t.foreground)
      .child(div().flex().flex_row().h(32).flex_none().px(10).gap(8).items_center().border_b(1).border_color(t.border)
        .when(!mock && this.history.length > 0, (el) => el.child(div().id("md-back").cursor_pointer().text_color(t.muted).on_click((_e, cx) => this.back(cx)).child("←")))
        .child(div().flex_1().min_w(0).truncate().text_size(12).text_color(t.dim).child(name)))
      .child(state.error
        ? div().p(pad).text_color(t.dim).child(state.error)
        : div().id("md-scroll").flex_1().min_h(0).overflow_y_scrollbar().p(pad)
            .child(TextView.markdown("md-body", state.text ?? "").selectable(true).on_link_click((url, cx) => this.link(url, cx))));
  }
}

// ===== STORYBOOK MOCK =====
// モック中(Story が開いたプレビュー)は選択値、本番なら null (STORYBOOK.md §3 の正本)。
export function storybook(mod) {
  const id = props()?.storybook;
  return id ? (shared(`storybook:${mod}:${id}`)?.values ?? {}) : null;
}

const LONG = "とても長い行 ".repeat(60);
const MOCK = {
  sample: { text: "# 見出し1\n\n本文。**太字** と *斜体* と `code`。\n\n- 項目A\n- 項目B\n\n> 引用文\n\n[相対リンク](./other.md) / [外部](https://example.com)\n\n![画像](./img.png)\n" },
  table: { text: "| 名前 | 値 | 説明 |\n|---|---|---|\n| a | 1 | 最初 |\n| b | 2 | 二番目 |\n| c | 3 | " + LONG + " |\n" },
  code: { text: "```js\nconst x = 1;\nfunction hello() {\n  return 'world';\n}\n```\n\n```sh\necho " + "very-long-token-".repeat(20) + "\n```\n" },
  long: { text: Array.from({ length: 40 }, (_, i) => `## 節 ${i + 1}\n\n${LONG}\n`).join("\n") },
  empty: { text: "" },
  error: { error: "ファイルが見つかりません" },
};
