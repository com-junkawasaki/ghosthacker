
# Ghost Hacker Producer Pipeline

> ✅ **The 2026-06 deprecation is retracted (2026-07-30, ADR-2607309900 addendum).**
> This repository is the home of GHOST HACKER. It is not superseded and it is
> not history.
>
> The retracted note said this pipeline was superseded by
> `kami-engine/kami-app-sip-clj` and that the repo was "kept for reference/history
> only". Neither held when checked:
>
> - `kotoba-lang/kami-engine/kami-app-sip-clj` contains `.shadow-cljs/` and
>   `public/` — no `src/`, no `deps.edn`. There is no pipeline there to be
>   superseded *by*.
> - Searching `kami-engine` for `ghosthacker` returns **zero** hits. The series
>   was never moved there.
> - This repo kept receiving real work after the note was written: the direct
>   rows-of-beats komawari export (ADR-2607172250) and the `edn-datomize`
>   bb → nbb migration (ADR-2607173000 Wave 1), through 2026-07.
>
> A series belongs with its own content, not inside a 3D/render engine's app
> directory. That is the reason the move was inappropriate in the first place.
>
> **What was true in that note and remains true:** the resource data here was
> converted from JSON-LD to EDN (`*.jsonld` → `*.edn`, keyword keys), so the
> TS/Go runtime loaders (`apps/web/src/lib/server/jsonld.ts`, `state.ts`,
> `apps/server/.../main.go`) no longer find their data. Those loaders are stale
> — the EDN is the source of truth. `.auth/wattpad.json` is left as-is.
>
> The two notes below still stand and are not affected by this retraction.

> ⚠️ **Doc/code mismatch (confirmed 2026-07-10, ADR-2607100900 addendum 1).**
> Everything below this line (Architecture, Tech Stack, `producer/` project
> layout, Quick Start, Wattpad auto-publish CLI, Roadmap checklist) describes
> a Next.js + Neo4j `producer/` app that **does not exist in this checkout** —
> `producer/` is absent, and `wattpad`/`video-gen`/`neo4j` have zero hits
> outside this file. There is no automated Wattpad publishing and no video
> generation implemented anywhere in this repo today; the roadmap checklist's
> `[x]` marks do not reflect working code. The only real, currently-working
> pipeline is `apps/web` (SvelteKit) + `apps/server` (Go), itself deprecated
> per the note above. Treat the rest of this README as historical/aspirational
> design notes, not a description of what runs.

> ⚠️ **Correction (2026-07-13, ADR-2607131400 addenda).** The claim just above
> ("the only real, currently-working pipeline") no longer held even before
> today: investigation found `apps/web`'s live UI already bypasses
> `apps/server` (Go) entirely for everything that actually works — panel
> editing/loading/etc. run through `apps/web/src/lib/server/*` TypeScript
> directly, not via `apps/server`'s ConnectRPC service. `apps/server`'s Dapr
> workflow feature ("autopilot"/chat autonomous-generation) was already
> unreachable from the UI — `ChatPanel.svelte` calls client methods
> (`startAutonomousGeneration` etc.) that don't exist on the fetch-based
> client that actually replaced the generated ConnectRPC client. Given this,
> `apps/server`'s Dapr (`internal/dapr/`), ConnectRPC (`proto/`,
> `internal/service/`, `cmd/server/`) — its entire external interface — and
> `apps/web`'s Lexical rich-text editor (`LexicalSceneEditor.svelte`, never
> mounted anywhere, confirmed zero references) have been removed outright
> rather than ported to cljs, since there was nothing live left to port.
> `apps/server/cmd/{mcp-cursor,indexer}` (independent tools, don't depend on
> the removed code) are kept. Also also: the named successor in the note
> above (`kami-app-sip-clj`) has itself moved to `orgs/etzhayyim/com-etzhayyim-sip`
> and, per its own README, is a distinct game product with a read-only
> storyboard *reader* (no save/edit/RPC/chat/PDF/job-queue) — it does not
> actually cover this pipeline's editing surface. The real current authoring
> workflow for published content is hand-edited EDN under
> `orgs/com-junkawasaki/org-spirit-in-physics-comics/` rendered by a
> babashka static-site generator, independent of both `apps/server` and
> `kami-app-sip-clj`.

Ghost Hackerは、2065年の水の都・東京を舞台に、情報生命体（Ghost）と人間の絆を描いた物語です。

## 現在の構成（2026-07-14 実態、上の訂正ノート参照）

- **`apps/web/`** — SvelteKit 5 のストーリーボードエディタUI。パネル編集/読み込みは
  `apps/web/src/lib/server/*`（TypeScript、localStorageベース）で完結し、バックエンドRPCには
  依存しない。チャットパネルの `/avatar <characterId>` ショートカットのみ画像生成が実際に動く
  （`generatePanelImage` 経由）。
- **`apps/image-gen-clj/`** — Clojure。画像生成のフリート委譲は
  `orgs/kotoba-lang/murakumo`（`murakumo.infer.media`/`.gateway`/`.fleet`/`.schedule`）に一本化
  （ADR-2607131400 addendum）。`apps/image-gen/`（Python、旧実装）は移行元として現存するが
  現在は使われていない。
- **`apps/server/`** — Go。Dapr（`internal/dapr/`）・ConnectRPC（`proto/`、
  `internal/service/`、`cmd/server/`）は退役済み（ADR-2607131400 addenda。外部インターフェース
  自体が無かったことが判明したため）。現存するのは独立バイナリの `cmd/mcp-cursor`（MCPサーバー）
  と `cmd/indexer` のみ。
- **`orgs/com-junkawasaki/org-spirit-in-physics-comics/`** — 実際の公開コンテンツの制作フロー。
  手編集のEDNデータをbabashkaの静的サイトジェネレータでレンダリングする、上記のいずれにも
  依存しない別経路。

Neo4j/producer/（Next.js）/tRPC/Wattpad自動投稿/動画生成ロードマップ等、以前この節にあった
アーキテクチャ図・技術スタック・プロジェクト構造・クイックスタート・ロードマップは、
このチェックアウトに実装が存在しないため削除した（2026-07-10 ADR-2607100900 addendum 1で
「架空」と確認済みの内容そのもの）。

## 貢献

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ライセンス

MIT License - see the [LICENSE](LICENSE) file for details.

---

*Ghost Hacker: Healing connections in a disconnected world*
 