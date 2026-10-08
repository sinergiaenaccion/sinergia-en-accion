import {send,notify,upsertContact,esc} from "./_resend.js";

export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 const b=req.body||{};
 if(!b.email||!b.consent) return res.status(400).json({error:"Necesitamos tu email y confirmación para enviarte novedades"});
 try{
  await upsertContact(b.email,{
   source:"Newsletter Sinergia",
   newsletter_consent:"true",
   origin:b.origin||"Diagnóstico Sinergia"
  });
  await notify("Nueva suscripción · Novedades Sinergia",
   "<h2>Nueva suscripción a novedades</h2><p><b>Email:</b> "+esc(b.email)+"</p><p><b>Origen:</b> "+esc(b.origin||"Diagnóstico Sinergia")+"</p><p><b>Fecha:</b> "+esc(b.submittedAt||"")+" </p>");
  await send(b.email,"Te sumaste a las novedades de Sinergia",
   "<h2>¡Gracias por sumarte!</h2><p>Vas a recibir novedades, contenidos y oportunidades de Sinergia en Acción.</p><p>Podés darte de baja cuando quieras desde el enlace de preferencias o baja incluido en nuestras comunicaciones.</p><p>Sinergia en Acción · Villa Allende, Córdoba, Argentina</p>");
  return res.status(200).json({ok:true});
 }catch(e){return res.status(500).json({error:"No pudimos completar la suscripción en este momento"})}
}
