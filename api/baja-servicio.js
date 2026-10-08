import {send,notify,esc} from "./_resend.js";
function code(){return "BAJA-"+Date.now().toString(36).toUpperCase().slice(-8)}
export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 const b=req.body||{}; if(!b.name||!b.email||!b.service) return res.status(400).json({error:"Faltan datos obligatorios"});
 try{
  const id=code();
  await notify("Botón de baja · Nueva solicitud","<h2>Solicitud de baja de servicio</h2><p><b>Código:</b> "+id+"</p><p><b>Nombre:</b> "+esc(b.name)+"</p><p><b>Email:</b> "+esc(b.email)+"</p><p><b>Servicio:</b> "+esc(b.service)+"</p><p><b>Motivo:</b> "+esc(b.reason)+"</p>");
  await send(b.email,"Confirmación de solicitud de baja · "+id,"<h2>Recibimos tu solicitud</h2><p>Tu pedido de baja fue recibido correctamente.</p><p><b>Código de identificación:</b> "+id+"</p><p>La solicitud será procesada por el mismo canal digital. Si necesitamos verificar datos para seguridad, te pediremos únicamente información razonable y pertinente.</p><p>Sinergia en Acción · Villa Allende, Córdoba, Argentina</p>");
  return res.status(200).json({ok:true,code:id});
 }catch(e){return res.status(500).json({error:"No pudimos procesar la solicitud en este momento"})}
}