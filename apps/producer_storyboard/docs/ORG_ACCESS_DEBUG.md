# 組織アクセス拒否問題のデバッグガイド

## 問題の概要

ユーザーが作成した組織 (`org_34WE9gEoK1FM0cxw8T04rFtaFU7`) にアクセスしようとすると、「組織へのアクセスが拒否されました」というエラーが表示される。

## BDD/TDD アプローチでの原因特定

### 1. 問題の再現シナリオ

```gherkin
シナリオ: ユーザーが作成した組織にアクセスできない
  前提 ユーザーが認証済みである
  かつ ユーザーが組織「org_34WE9gEoK1FM0cxw8T04rFtaFU7」を作成している
  もし ユーザーが組織「org_34WE9gEoK1FM0cxw8T04rFtaFU7」のプロジェクトページにアクセスしている
  ならば アクセスが許可される
  かつ エラーメッセージが表示されない
```

### 2. 原因の仮説

以下のいずれかが原因である可能性が高い：

#### 仮説1: 組織作成後にメンバーシップが正しく設定されていない
- **症状**: `clerkClient.users.getOrganizationMembershipList` が作成した組織を返さない
- **確認方法**: サーバーログで `[OrgLayout Server] User organizations from Clerk API` を確認
- **解決策**: 組織作成後にメンバーシップを明示的に確認・追加する

#### 仮説2: セッションの組織IDが設定されていない
- **症状**: `auth.orgId` が `null` または別の値になっている
- **確認方法**: サーバーログで `[OrgLayout Server] Auth state` を確認
- **解決策**: 組織作成後にセッションを更新する

#### 仮説3: 組織IDの不一致
- **症状**: フロントエンドで使用している組織IDとClerkの実際の組織IDが異なる
- **確認方法**: サーバーログで `requestedOrgId` と `availableOrgIds` を比較
- **解決策**: 組織IDの取得方法を確認・修正する

### 3. デバッグ手順

1. **サーバーログの確認**
   ```bash
   # 開発サーバーのログを確認
   # 以下のログメッセージを探す：
   # - [OrgLayout Server] Auth state
   # - [OrgLayout Server] Pre-verification check
   # - [OrgLayout Server] User organizations from Clerk API
   # - [OrgLayout Server] Organization access check result
   ```

2. **Clerkダッシュボードでの確認**
   - ユーザーが組織のメンバーとして登録されているか確認
   - 組織IDが正しいか確認
   - ユーザーのロール（admin/member）を確認

3. **セッションの確認**
   - ブラウザの開発者ツールでCookieを確認
   - Clerkのセッショントークンを確認

### 4. 修正方法

#### 修正1: 組織作成後のセッション更新

組織作成後、Clerkのセッションを明示的に更新する：

```typescript
// 組織作成後
if (clerk?.clerk) {
  await clerk.clerk.setActive({ organization: newOrgId });
  // セッションを再読み込み
  await clerk.clerk.reload();
}
```

#### 修正2: メンバーシップの明示的な確認

組織作成後、メンバーシップが正しく設定されているか確認する：

```typescript
// 組織作成後
const memberships = await clerkClient.users.getOrganizationMembershipList({
  userId: auth.userId,
});
const orgExists = memberships.data?.some(
  m => m.organization.id === newOrgId
);
if (!orgExists) {
  console.error('Organization membership not found after creation');
  // メンバーシップを追加する処理
}
```

#### 修正3: 開発モードでの一時的な回避策

開発モードでは、アクセスチェックを緩和する（既に実装済み）：

```typescript
const isDevelopment = process.env.NODE_ENV !== 'production';
if (!isDevelopment) {
  throw error(403, `Access denied to organization: ${orgId}`);
} else {
  console.warn('[OrgLayout Server] ACCESS DENIED BUT ALLOWED IN DEVELOPMENT MODE');
}
```

### 5. テストケース

以下のテストケースで問題を再現・検証する：

```typescript
describe('Organization Access', () => {
  it('should allow access to organization created by user', async () => {
    // 1. ユーザーが組織を作成
    // 2. 組織IDを取得
    // 3. その組織にアクセス
    // 4. アクセスが許可されることを確認
  });

  it('should list created organization in user organizations', async () => {
    // 1. ユーザーが組織を作成
    // 2. getUserOrganizationsを呼び出し
    // 3. 作成した組織がリストに含まれることを確認
  });
});
```

## 次のステップ

1. サーバーログを確認して、実際の原因を特定する
2. 上記の仮説に基づいて修正を実装する
3. BDDテストで修正を検証する
4. 本番環境にデプロイする前に、開発モードの回避策を削除する

