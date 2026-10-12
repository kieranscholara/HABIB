import { NextResponse } from 'next/server';
import { live } from '@/lib/server';
export function GET(){return NextResponse.json({mode:live()?'live':'local',speechConfigured:!!(process.env.AZURE_SPEECH_KEY&&process.env.AZURE_SPEECH_REGION),aiConfigured:!!process.env.HABIB_OPENAI_KEY},{headers:{'Cache-Control':'no-store'}});}
