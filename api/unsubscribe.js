import {send,notify,unsubscribe,esc} from "./_resend.js";
export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 const b=req.body||{}; if(!b.email||!b.reason) return res.status(400).json({error:"Faltan datos obligatorios"});
 try{
  await unsubscribe(b.email);
  await notify("Solicitud de baja de novedades","<h2>Nueva baja de novedades</h2><p><b>Email:</b> "+esc(b.email)+"</p><p><b>Motivo:</b> "+esc(b.reason)+"</p>");
  await send(b.email,"Confirmación de baja · Sinergia en Acción","<h2>Confirmamos tu baja</h2><p>Recibimos correctamente tu solicitud y tu dirección quedó marcada para no recibir novedades comerciales de Sinergia en Acción.</p><p>Motivo informado: "+esc(b.reason)+"</p><p>Si en el futuro querés volver a recibir novedades, podrás solicitarlo nuevamente.</p>");
  return res.status(200).json({ok:true});
 }catch(e){return res.status(500).json({error:"No pudimos procesar la baja en este momento"})}
}