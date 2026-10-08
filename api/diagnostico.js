export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 const key=process.env.RESEND_API_KEY;
 if(!key) return res.status(503).json({error:"Email service not configured"});
 const b=req.body||{},esc=v=>String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
 const html="<h2>Nuevo contacto / diagnóstico Sinergia</h2><p><b>Empresa:</b> "+esc(b.company)+"</p><p><b>Email:</b> "+esc(b.email)+"</p><p><b>Origen:</b> "+esc(b.source)+"</p><p><b>Código:</b> "+esc(b.code)+"</p><p><b>Fecha:</b> "+esc(b.submittedAt)+"</p><h3>Respuestas</h3><pre>"+esc(JSON.stringify(b.answers||{},null,2))+"</pre><h3>Lectura preliminar</h3><pre>"+esc(JSON.stringify(b.analysis||{},null,2))+"</pre>";
 try{
  const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},body:JSON.stringify({from:process.env.RESEND_FROM_EMAIL||"Sinergia Digital <onboarding@resend.dev>",to:[process.env.RESEND_TO_EMAIL||"sinergiaenaccion.consultoria@gmail.com"],subject:(b.source||"Sinergia")+" · "+(b.company||"Contacto"),html})});
  const data=await r.json();return res.status(r.ok?200:r.status).json(data);
 }catch(e){return res.status(500).json({error:"Send failed"})}
}