/**
 * 設定保存API
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, settings } = body;

    // 実際の実装では、設定をデータベースに保存する
    // ここでは簡略化のため、成功レスポンスを返すだけ

    console.log('Saving settings for project:', projectId, settings);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Settings save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      { status: 500 }
    );
  }
}

