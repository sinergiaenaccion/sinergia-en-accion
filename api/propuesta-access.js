export default async function handler(req,res){
 if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});
 const configured=(process.env.SINERGIA_PROPOSAL_CODES||"").split(",").map(x=>x.trim()).filter(Boolean);
 if(!configured.length) return res.status(503).json({error:"Proposal access is not configured"});
 const code=String(req.body?.code||"").trim();
 if(!code) return res.status(400).json({error:"Code required"});
 const ok=configured.includes(code);
 return res.status(ok?200:401).json({ok});
}