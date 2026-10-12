import { NextRequest, NextResponse } from 'next/server';
export const live = () => process.env.HABIB_LIVE_PROVIDERS === 'true';
export function guard(req:NextRequest) {
 const origin=req.headers.get('origin');
 if(!origin || new URL(origin).host!==req.headers.get('host') || !['http:','https:'].includes(new URL(origin).protocol)) throw new Error('Request origin rejected');
}
export function failure(error:unknown) { return NextResponse.json({error:error instanceof Error && /^(Request|Configure|Invalid|Recording)/.test(error.message)?error.message:'Provider unavailable. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}}); }
export function azure() {
 const key=process.env.AZURE_SPEECH_KEY,region=process.env.AZURE_SPEECH_REGION;
 if(!key||!region||! /^[a-z0-9-]+$/.test(region)) throw new Error('Configure Azure speech key and region in environment settings.');
 return {key,region};
}
export async function providerFetch(url:string,init:RequestInit) {
 const result=await fetch(url,{...init,signal:AbortSignal.timeout(15000),cache:'no-store'});
 if(!result.ok) throw new Error('Provider unavailable');
 return result;
}
