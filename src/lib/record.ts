// Capture PCM directly so Safari and Chrome do not depend on a provider accepting WebM/AAC.
export async function record(onLimit:()=>void){
 const stream=await navigator.mediaDevices.getUserMedia({audio:true});
 const context=new AudioContext();
 try { await context.resume(); } catch(e){stream.getTracks().forEach(t=>t.stop());await context.close();throw e;}
 const source=context.createMediaStreamSource(stream),processor=context.createScriptProcessor(4096,1,1),mute=context.createGain(); mute.gain.value=0;
 const chunks:Float32Array[]=[];let count=0,closed=false;
 processor.onaudioprocess=e=>{const available=Math.max(0,context.sampleRate*30-count);const data=e.inputBuffer.getChannelData(0).slice(0,available);chunks.push(data);count+=data.length;};
 source.connect(processor);processor.connect(mute);mute.connect(context.destination);
 const timer=setTimeout(onLimit,30000);
 return async()=>{
 if(closed)throw new Error('Recording already stopped'); closed=true;clearTimeout(timer);
 processor.disconnect();source.disconnect();stream.getTracks().forEach(t=>t.stop());
 const rate=context.sampleRate;await context.close();
 const raw=new Float32Array(count);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length;}
 const size=Math.floor(count*16000/rate),buffer=new ArrayBuffer(44+size*2),view=new DataView(buffer);
 const write=(at:number,t:string)=>{for(let i=0;i<t.length;i++)view.setUint8(at+i,t.charCodeAt(i));};
 write(0,'RIFF');view.setUint32(4,36+size*2,true);write(8,'WAVE');write(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);write(36,'data');view.setUint32(40,size*2,true);
 for(let i=0;i<size;i++){const from=Math.floor(i*rate/16000),to=Math.min(count,Math.floor((i+1)*rate/16000));let total=0;for(let j=from;j<to;j++)total+=raw[j];const sample=Math.max(-1,Math.min(1,total/Math.max(1,to-from)));view.setInt16(44+i*2,sample*(sample<0?32768:32767),true);}
 return new Blob([buffer],{type:'audio/wav'});
 };
}
