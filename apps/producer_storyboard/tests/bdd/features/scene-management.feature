# language: ja
機能: シーン管理
  capabilities.jsonldの「Scene Management」capabilityを実装

  シナリオ: ストーリーボードのシーン一覧を取得する
    前提 GraphQL APIが起動している
    かつ ストーリーボードが存在する
    かつ ストーリーボードにシーンが存在する
    もし ユーザーがシーン一覧をリクエストする
    ならば シーンのリストが返される
    かつ シーンはsceneNumberでソートされる
    かつ 各シーンにid、sceneNumber、textDescriptionが含まれる

  シナリオ: シーン詳細を取得する
    前提 GraphQL APIが起動している
    かつ シーンが存在する
    もし ユーザーがシーンIDでシーンを取得する
    ならば シーン詳細が返される
    かつ シーンにstartTimeSeconds、durationSecondsが含まれる

