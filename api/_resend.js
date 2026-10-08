const KEY=process.env.RESEND_API_KEY;
const FROM=process.env.RESEND_FROM_EMAIL||"Sinergia en Acción <onboarding@resend.dev>";
const TO=process.env.RESEND_TO_EMAIL||"sinergiaenaccion.consultoria@gmail.com";
const esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));
async function resend(path,method,body){
 if(!KEY) throw new Error("RESEND_API_KEY missing");
 const r=await fetch("https://api.resend.com"+path,{method,headers:{"Content-Type":"application/json","Authorization":"Bearer "+KEY},body:JSON.stringify(body)});
 const data=await r.json(); if(!r.ok) throw new Error(data?.message||"Resend error"); return data;
}
export async function send(to,subject,html){ return resend("/emails","POST",{from:FROM,to:[to],subject,html}); }
export async function notify(subject,html){ return resend("/emails","POST",{from:FROM,to:[TO],subject,html}); }
export async function upsertContact(email,properties,unsubscribed=false){ return resend("/contacts","POST",{email,unsubscribed,properties}); }
export async function unsubscribe(email){ return resend("/contacts/"+encodeURIComponent(email),"PATCH",{unsubscribed:true}); }
export {esc};