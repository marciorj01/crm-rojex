import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { apiError } from '@/lib/http';
export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user }, { status: user ? 200 : 401, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
