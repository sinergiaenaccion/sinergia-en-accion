import {send,notify,esc} from "./_resend.js";
function code(){return "SIN-"+Date.now().toString(36).toUpperCase().slice(-8)}
export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 const b=req.body||{}; if(!b.name||!b.email||!b.product||!b.date) return res.status(400).json({error:"Faltan datos obligatorios"});
 try{
  const id=code();
  await notify("Botón de arrepentimiento · Nueva solicitud","<h2>Solicitud de revocación</h2><p><b>Código:</b> "+id+"</p><p><b>Nombre:</b> "+esc(b.name)+"</p><p><b>Email:</b> "+esc(b.email)+"</p><p><b>Producto/servicio:</b> "+esc(b.product)+"</p><p><b>Operación:</b> "+esc(b.order)+"</p><p><b>Fecha de compra:</b> "+esc(b.date)+"</p><p><b>Comentario:</b> "+esc(b.comments)+"</p>");
  await send(b.email,"Confirmación de solicitud de arrepentimiento · "+id,"<h2>Recibimos tu solicitud</h2><p>Tu pedido de revocación fue recibido correctamente.</p><p><b>Código de identificación:</b> "+id+"</p><p>Conservá este código para el seguimiento. Dentro del proceso podremos solicitar una verificación razonable de identidad o titularidad de la operación exclusivamente por seguridad.</p><p>Sinergia en Acción · Villa Allende, Córdoba, Argentina</p>");
  return res.status(200).json({ok:true,code:id});
 }catch(e){return res.status(500).json({error:"No pudimos procesar la solicitud en este momento"})}
}