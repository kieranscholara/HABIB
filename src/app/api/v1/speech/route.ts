import { NextRequest } from 'next/server';
import { azure,guard,failure,live,providerFetch } from '@/lib/server';
import { z } from 'zod';
const escape=(s:string)=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]!));
export async function POST(req:NextRequest){try{
 guard(req); if(!live())throw new Error('Configure live providers to hear Azure Maltese speech.');
 const raw=await req.text(); if(raw.length>2000)throw new Error('Invalid request size');
 const {text}=z.object({text:z.string().min(1).max(500)}).strict().parse(JSON.parse(raw));
 const {key,region}=azure();
 const audio=await providerFetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':key,'Content-Type':'application/ssml+xml','X-Microsoft-OutputFormat':'audio-16khz-32kbitrate-mono-mp3'},body:`<speak version="1.0" xml:lang="mt-MT"><voice name="mt-MT-GraceNeural">${escape(text)}</voice></speak>`});
 return new Response(await audio.arrayBuffer(),{headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
