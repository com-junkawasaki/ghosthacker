# wasmCloudコンポーネント実装の次のステップ

## 1. テンプレートの確認

wasmCloudコンポーネントのテンプレートを確認する：

```bash
# 利用可能なテンプレートを確認（対話的に）
wash new component test-component
```

## 2. WITインターフェースの定義

既存の`schema/wasmcloud-interfaces.wit`を基に、wasmCloudコンポーネント用のWITファイルを作成。

## 3. コンポーネント実装

既存のライブラリコード（rag-openai等）をwasmCloudコンポーネントとしてラップ。

## 4. HTTPサーバーコンポーネント

HTTPエンドポイントを提供するコンポーネントを実装。

## 参考リンク

- [wasmCloud公式ドキュメント](https://wasmcloud.com/docs/)
- [wasmCloud GitHub](https://github.com/wasmCloud/wasmCloud)
- [wasmCloudロードマップ](https://wasmcloud.com/docs/roadmap/)
