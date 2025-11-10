/**
 * TerminusDB初期化API
 */

import { NextResponse } from 'next/server';
import { initializeTerminusDB } from '@/internal/terminusdb/client';
import { applyOWLSchema } from '@/internal/terminusdb/schema';

export async function POST() {
  try {
    await initializeTerminusDB();
    await applyOWLSchema();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('TerminusDB initialization error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize TerminusDB' },
      { status: 500 }
    );
  }
}

