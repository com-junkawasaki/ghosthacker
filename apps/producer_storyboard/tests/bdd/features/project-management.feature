# language: ja
機能: プロジェクト管理
  capabilities.jsonldの「Project Management」capabilityを実装

  シナリオ: プロジェクト一覧を取得する
    前提 GraphQL APIが起動している
    かつ データベースにプロジェクトが存在する
    もし ユーザーがプロジェクト一覧をリクエストする
    ならば プロジェクトのリストが返される
    かつ 各プロジェクトにid、title、descriptionが含まれる

  シナリオ: 新しいプロジェクトを作成する
    前提 GraphQL APIが起動している
    かつ データベースが空である
    かつ タイトルが「Test Project」である
    かつ 説明が「Test Description」である
    もし ユーザーが新しいプロジェクトを作成する
    ならば プロジェクトが作成される
    かつ プロジェクトIDが返される
    かつ 作成日時が設定される

