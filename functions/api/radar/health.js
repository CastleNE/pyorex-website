export async function onRequestGet({env}) {
  if(!env.PYOREX_DB) return Response.json({status:'setup_required',binding:'PYOREX_DB'},{status:503});
  try{
    const row=await env.PYOREX_DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='radar_items'").first();
    return Response.json({status:row?'ready':'migration_required',binding:'PYOREX_DB',schema:Boolean(row)});
  }catch(e){return Response.json({status:'error',message:String(e?.message||e)},{status:500})}
}
