import { View, div } from "gpui-kit";
import { theme, shared, props } from "herdr";

// モック中(Story が開いたプレビュー)は選択値、本番なら null (STORYBOOK.md §3 の正本)。
// mock は別ファイルにせずこの main.js に置く(mods-watcher のファイル単位 symlink では ./mock.js が check で弾かれる)。
export function storybook(mod) {
  const id = props()?.storybook;
  return id ? (shared(`storybook:${mod}:${id}`)?.values ?? {}) : null;
}

// 状態ごとのモックデータ。本番データ関数と副作用のある呼び出しは、モック中は使わない。
const MOCK = {};

export default class extends View {
  render(_cx) {
    return div().size_full().bg(theme().surface).p(10).child("hello");
  }
}
