# ADR-260823: 作者核をprivateなGhosthacker正本に置く

**Status:** accepted

**Date:** 2026-08-23

**Decider:** Jun Kawasaki

## Context

Ghosthacker、Shiropico、Spirit in Physicsに通底する作者の原体験、宗教観、人物の神経特性、
シリーズの救いの構造が提示された。この情報は制作上の最上流にあるが、個人的かつ機微であり、
公開repoのアプリ実装や一般ライブラリの既定値に埋め込むべきではない。

確認したrepoの可視性は次のとおり。

- `cloud-itonami/app-mangaka`: public — 不採用
- `cloud-itonami/mangaka-data`: public — 不採用
- `cloud-itonami/mangaka`: private — 汎用制作ランタイムであり、作品固有の作者核の正本にはしない
- `com-junkawasaki/ghosthacker`: private — 人物、アーク、シリーズ設計の既存正本
- `com-junkawasaki/org-spirit-in-physics`: private — Spirit in Physics固有資料の正本
- `com-junkawasaki/ghosthacker-shiropico`: private — Shiropico固有資料の正本

## Decision

1. 三シリーズを横断する作者核のprivate正本を、このrepoの
   `docs/creative-bible/series-authorial-core.md` に置く。
2. 制作ツールが参照できる最小限の構造化正本を、同じ場所の `.edn` に置く。
3. Spirit in PhysicsとShiropicoの個別設定は、それぞれのprivate repoを正本とする。横断原則のみ
   本文書に残し、設定を重複させない。
4. 公開repoへは、作者が明示承認した抽象化済みの制作原則だけを派生させる。原体験、信仰、診断名を
   含む本文の転載・要約・引用は自動化しない。
5. 診断名や俗称は非公開の創作出発点に留める。人物への臨床診断、犯罪性、道徳性を意味しない。
   生成処理はラベルではなく、観察可能な認知・感覚・選択・関係の記述を入力とする。
6. 各ネームの最初の門を「この話で、作者がいま本当に描きたいことは何か」とし、答えがない場合は
   設定や動画生成へ進まない。

## Consequences

- 個人的な作者核をpublicなアプリrepoから分離できる。
- Ghosthackerの人物・アーク設計と同じprivate履歴で、作者核の変化を追跡できる。
- 他シリーズは独自のprivate正本を保ちつつ、共通の約束と非交渉条件を参照できる。
- 将来publicな制作ライブラリへ原則を移す際、明示的な編集・承認工程が必要になる。
- 横断正本をGhosthacker repoに置く非対称性は残る。三シリーズが独立制作体制になった時点で、
  専用private canon repoへの分離を再検討する。

## References

- `docs/creative-bible/series-authorial-core.md`
- `docs/creative-bible/series-authorial-core.edn`
- `docs/creative-bible/character-scenario-arcs.md`
- `docs/creative-bible/character-scenario-arcs.edn`
- `com-junkawasaki/org-spirit-in-physics`
- `com-junkawasaki/ghosthacker-shiropico`
