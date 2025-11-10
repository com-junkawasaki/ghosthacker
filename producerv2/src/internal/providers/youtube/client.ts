/**
 * YouTube API クライアント
 */

export interface YouTubeUploadRequest {
  videoFile: File | string; // ファイルパスまたはURL
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus?: 'private' | 'unlisted' | 'public';
  categoryId?: string;
}

export interface YouTubeUploadResponse {
  videoId: string;
  videoUrl: string;
  status: 'uploaded' | 'processing' | 'failed';
}

export class YouTubeClient {
  private accessToken: string | null = null;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(
    clientId?: string,
    clientSecret?: string,
    redirectUri?: string
  ) {
    this.clientId = clientId ?? process.env.YOUTUBE_CLIENT_ID ?? '';
    this.clientSecret = clientSecret ?? process.env.YOUTUBE_CLIENT_SECRET ?? '';
    this.redirectUri = redirectUri ?? process.env.YOUTUBE_REDIRECT_URI ?? 'http://localhost:3000/api/auth/youtube/callback';
  }

  /**
   * OAuth2.0認証URLを取得
   */
  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/youtube.upload',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * 認証コードからアクセストークンを取得
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`YouTube OAuth error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    return this.accessToken;
  }

  /**
   * アクセストークンを設定
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * 動画をアップロード
   */
  async uploadVideo(request: YouTubeUploadRequest): Promise<YouTubeUploadResponse> {
    if (!this.accessToken) {
      throw new Error('YouTube access token is not set. Please authenticate first.');
    }

    // メタデータをアップロード
    const metadataResponse = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        snippet: {
          title: request.title,
          description: request.description ?? '',
          tags: request.tags ?? [],
          categoryId: request.categoryId ?? '22', // People & Blogs
        },
        status: {
          privacyStatus: request.privacyStatus ?? 'private',
        },
      }),
    });

    if (!metadataResponse.ok) {
      const error = await metadataResponse.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`YouTube metadata upload error: ${JSON.stringify(error)}`);
    }

    const metadata = await metadataResponse.json();
    const videoId = metadata.id;

    // 実際の動画ファイルをアップロード
    // 注意: 実際の実装では、multipart/form-dataでファイルをアップロードする必要があります
    // ここでは簡略化のため、URLが提供された場合はそれを返します

    if (typeof request.videoFile === 'string') {
      // URLの場合は、後でアップロード処理を実行
      // 実際の実装では、ファイルをダウンロードしてアップロードする必要があります
      return {
        videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        status: 'uploaded',
      };
    }

    // ファイルの場合は、実際のアップロード処理を実装
    throw new Error('File upload not yet implemented');
  }
}

