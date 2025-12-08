# language: ja
機能: 動画生成
  capabilities.jsonldの「AI Video Generation」capabilityを実装

  シナリオ: 動画生成を開始する
    前提 GraphQL APIが起動している
    かつ ストーリーボードが存在する
    もし ユーザーが動画生成をリクエストする
    ならば 動画生成ジョブが作成される
    かつ ステータスが「pending」である
    かつ variationNumberが設定される

  シナリオ: 生成済み動画一覧を取得する
    前提 GraphQL APIが起動している
    かつ ストーリーボードが存在する
    かつ 動画生成ジョブが存在する
    もし ユーザーが生成済み動画一覧をリクエストする
    ならば 動画のリストが返される
    かつ 各動画にid、status、variationNumberが含まれる

