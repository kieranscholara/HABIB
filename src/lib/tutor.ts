import { z } from 'zod';
export const inputSchema = z.object({text:z.string().trim().min(1).max(500),step:z.number().int().min(0).max(2),mistakes:z.number().int().min(0).max(2)}).strict();
export type Input = z.infer<typeof inputSchema>;
const numbers: Record<string,number> = {ħamsa:5,hamsa:5,five:5,ħmistax:15,hmistax:15,fifteen:15};
export function answer(text:string) { const t=text.trim().toLowerCase().replace(/[.!]$/,''); return numbers[t] ?? (/^\d+$/.test(t) ? Number(t) : null); }
export function guide(input:Input) {
 const {text,step,mistakes}=input;
 if(step===2) return {text:'Lestejna! Tliet kwarti ta’ 20 huma 15. Tista’ tibda mill-ġdid.',step:2,mistakes:0,correct:null};
 if(/(?:hurt|danger|abuse|weġġa|periklu)/i.test(text)) return {text:'Waqqaf il-lezzjoni u kellem adult li tafda. Jekk hemm periklu immedjat, itlob għajnuna ta’ emerġenza.',step,mistakes,correct:null};
 const value=answer(text), expected=step===0?5:15;
 if(value===expected) return step===0 ? {text:'Iva, kwart ta’ 20 huwa 5. Issa għaqqad tliet gruppi ta’ 5. Kemm hu 5 × 3?',step:1,mistakes:0,correct:true} : {text:'Iva! 5 × 3 = 15. Għalhekk tliet kwarti ta’ 20 huma 15. Lestejna din il-lezzjoni.',step:2,mistakes:0,correct:true};
 if(value===null) return {text:step===0?'Ejja nsibu tliet kwarti ta’ 20. L-ewwel naqsmu 20 f’erba’ gruppi ndaqs. Kemm hu 20 ÷ 4?':'Kwart wieħed huwa 5. Għal tliet kwarti rridu tliet gruppi. Kemm hu 5 × 3?',step,mistakes,correct:null};
 return {text:step===0?(mistakes>=1?'20 ÷ 4 = 5, għax 4 × 5 = 20. Issa pprova: kemm hu kwart ta’ 20?':'Erġa’ pprova. Liema numru mmultiplikat b’4 jagħti 20?'):(mistakes>=1?'Żewġ gruppi ta’ 5 jagħtu 10. Żid grupp ieħor ta’ 5. Kemm hu t-total?':'Erġa’ pprova. Għodd tliet gruppi ta’ 5. Kemm hu t-total?'),step,mistakes:Math.min(2,mistakes+1),correct:false};
}
