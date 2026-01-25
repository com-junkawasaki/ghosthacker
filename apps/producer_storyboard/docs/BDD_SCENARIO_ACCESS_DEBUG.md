# BDDによるシナリオアクセス拒否問題の原因特定

## 問題の概要

ユーザーが自分の組織のプロジェクトに属するシナリオを取得しようとすると、「Access denied: Project does not belong to your organization」というエラーが発生する。

## BDDアプローチでの原因特定

### 1. 問題の再現シナリオ

```gherkin
シナリオ: ユーザーが自分の組織のプロジェクトに属するシナリオを取得する（project.org_idを使用）
  前提 GraphQL APIが起動している
  かつ ユーザーが組織「org_test」に所属している
  かつ プロジェクトが存在する
  かつ プロジェクトが組織「org_test」に属している
  かつ プロジェクトのorg_idが「org_test」である
  かつ シナリオが存在する
  かつ シナリオのorg_idがNULLである
  もし ユーザーがシナリオIDでシナリオを取得する
  ならば シナリオ詳細が返される
  かつ エラーメッセージ「Access denied」が表示されない
```

### 2. 原因の仮説

以下のいずれかが原因である可能性が高い：

#### 仮説1: scenarioクエリがscenario.org_idのみをチェックしている
- **症状**: scenarioの`org_id`がNULLの場合、projectの`org_id`をチェックせずにアクセスを拒否している
- **確認方法**: `performers/services/graphql/src/resolvers/query.rs`の`scenario`関数を確認
- **期待される動作**: scenarioの`org_id`がNULLの場合は、projectの`org_id`をチェックする

#### 仮説2: scenarioとprojectのJOINが正しく行われていない
- **症状**: scenarioクエリでprojectテーブルとJOINしていない
- **確認方法**: SQLクエリでJOINが含まれているか確認
- **期待される動作**: `COALESCE(s.org_id, p.org_id)`を使用してprojectのorg_idをフォールバックとして使用

#### 仮説3: エラーメッセージが不一致
- **症状**: `scenarios`クエリと`scenario`クエリで異なるエラーメッセージが返される
- **確認方法**: 両方のクエリのエラーメッセージを比較
- **期待される動作**: 一貫したエラーメッセージ「Access denied: Project does not belong to your organization」

### 3. BDDテストの実行

#### テストファイルの場所
- Feature: `tests/bdd/features/scenario-access-control.feature`
- Step Definitions: `tests/bdd/step_definitions/graphql-steps.ts`

#### テストの実行方法

```bash
# GraphQL APIを起動
cd performers/services/graphql
cargo run

# 別のターミナルでBDDテストを実行
cd tests/bdd
npm test -- scenario-access-control.feature
```

#### 期待されるテスト結果

**修正前（失敗）:**
```
シナリオ: ユーザーが自分の組織のプロジェクトに属するシナリオを取得する（project.org_idを使用）
  ❌ エラーメッセージ「Access denied: Project does not belong to your organization」が返される
```

**修正後（成功）:**
```
シナリオ: ユーザーが自分の組織のプロジェクトに属するシナリオを取得する（project.org_idを使用）
  ✅ シナリオ詳細が返される
  ✅ エラーメッセージ「Access denied」が表示されない
```

### 4. 修正内容

`performers/services/graphql/src/resolvers/query.rs`の`scenario`関数を以下のように修正：

```rust
// 修正前
let scenario_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
    "SELECT org_id FROM scenarios WHERE id = $1"
)
.bind(scenario_uuid)
.fetch_optional(pool.as_ref())
.await?;

match scenario_org {
    None => return Ok(None),
    Some(Some(scenario_org_id)) => {
        if scenario_org_id != org.id {
            return Err(async_graphql::Error::new("Access denied"));
        }
    }
    Some(None) => {
        // Scenario exists but org_id is NULL - allow access
    }
}

// 修正後
let project_org: Option<Option<String>> = sqlx::query_scalar::<_, Option<String>>(
    r#"
    SELECT COALESCE(s.org_id, p.org_id)
    FROM scenarios s
    JOIN storyboard_projects p ON s.project_id = p.id
    WHERE s.id = $1
    "#
)
.bind(scenario_uuid)
.fetch_optional(pool.as_ref())
.await?;

match project_org {
    None => {
        // Scenario doesn't exist
        return Ok(None);
    }
    Some(Some(project_org_id)) => {
        // Project exists and has org_id
        if project_org_id != org.id {
            return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
        }
    }
    Some(None) => {
        // Scenario exists but both scenario.org_id and project.org_id are NULL
        // Deny access for org-scoped requests
        return Err(async_graphql::Error::new("Access denied: Project does not belong to your organization"));
    }
}
```

### 5. 検証手順

1. **BDDテストの実行**
   ```bash
   cd tests/bdd
   npm test -- scenario-access-control.feature
   ```

2. **手動テスト**
   - GraphQL Playgroundで`scenario`クエリを実行
   - scenarioの`org_id`がNULLで、projectの`org_id`が設定されている場合にアクセスが許可されることを確認

3. **統合テスト**
   - E2Eテストでシナリオページにアクセス
   - エラーメッセージが表示されないことを確認

### 6. 関連ファイル

- **GraphQL Resolver**: `performers/services/graphql/src/resolvers/query.rs`
- **BDD Feature**: `tests/bdd/features/scenario-access-control.feature`
- **Step Definitions**: `tests/bdd/step_definitions/graphql-steps.ts`
- **Migration**: `performers/services/graphql/migrations/011_create_scenario_tables.sql`

### 7. まとめ

BDDアプローチにより、以下の原因を特定しました：

1. **根本原因**: `scenario`クエリがscenarioの`org_id`のみをチェックし、NULLの場合はprojectの`org_id`をチェックしていなかった
2. **修正方法**: JOINを使用して`COALESCE(s.org_id, p.org_id)`でprojectの`org_id`をフォールバックとして使用
3. **検証**: BDDテストで修正前後の動作を確認

この修正により、`scenarios`クエリと`scenario`クエリのアクセス制御ロジックが一致し、エラーが解消されます。

