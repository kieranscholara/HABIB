import { NextRequest,NextResponse } from 'next/server';
import { azure,guard,failure,live,providerFetch } from '@/lib/server';
export async function POST(req:NextRequest){try{
 guard(req); if(!live())return NextResponse.json({error:'Live speech is disabled. Use text input in local mode.'},{status:503});
 const bytes=new Uint8Array(await req.arrayBuffer());
 const view=new DataView(bytes.buffer);
 if(bytes.length<46||bytes.length>960044||new TextDecoder().decode(bytes.slice(0,4))!=='RIFF'||new TextDecoder().decode(bytes.slice(8,12))!=='WAVE'||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==16000||view.getUint16(34,true)!==16||view.getUint32(40,true)!==bytes.length-44) return NextResponse.json({error:'Recording must be 16 kHz mono PCM WAV, up to 30 seconds.'},{status:400});
 const {key,region}=azure(),start=performance.now();
 const data=await (await providerFetch(`https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=mt-MT&format=detailed`,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':key,'Content-Type':'audio/wav; codecs=audio/pcm; samplerate=16000'},body:bytes})).json();
 const text=data.NBest?.[0]?.Display || data.DisplayText;
 if(data.RecognitionStatus!=='Success'||!text)return NextResponse.json({error:'Ma fhimtx. Erġa’ pprova jew ikteb il-mistoqsija.'},{status:422});
 return NextResponse.json({text,confidence:data.NBest?.[0]?.Confidence??null,transcriptionMs:Math.round(performance.now()-start)},{headers:{'Cache-Control':'no-store'}});
}catch(e){return failure(e);}}
