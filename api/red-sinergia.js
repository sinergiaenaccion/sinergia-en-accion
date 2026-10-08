import {send,notify,upsertContact,esc} from "./_resend.js";
export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 const b=req.body||{}; if(!b.name||!b.email||!b.phone||!b.service||!b.participation||!b.contactConsent) return res.status(400).json({error:"Faltan datos obligatorios"});
 try{
  await upsertContact(b.email,{source:"Red Sinergia",name:b.name,company:b.company,phone:b.phone,service:b.service,participation:b.participation,comments:b.comments,news_consent:b.newsConsent?"true":"false"});
  await notify("Nueva solicitud · Red Sinergia","<h2>Nueva solicitud de Red Sinergia</h2><p><b>Nombre:</b> "+esc(b.name)+"</p><p><b>Empresa:</b> "+esc(b.company)+"</p><p><b>Email:</b> "+esc(b.email)+"</p><p><b>Teléfono:</b> "+esc(b.phone)+"</p><p><b>Servicio:</b> "+esc(b.service)+"</p><p><b>Participación:</b> "+esc(b.participation)+"</p><p><b>Comentarios:</b> "+esc(b.comments)+"</p><p><b>Novedades:</b> "+(b.newsConsent?"Sí":"No")+"</p>");
  await send(b.email,"Recibimos tu solicitud · Red Sinergia","<h2>¡Recibimos tu solicitud!</h2><p>Gracias por querer sumarte a Red Sinergia. Tu información fue recibida correctamente y será revisada para dar continuidad a la propuesta.</p><p>Si necesitamos ampliar algún dato, nos pondremos en contacto por los medios que indicaste.</p><p>Sinergia en Acción · Villa Allende, Córdoba, Argentina</p>");
  return res.status(200).json({ok:true});
 }catch(e){return res.status(500).json({error:"No pudimos procesar la solicitud en este momento"})}
}