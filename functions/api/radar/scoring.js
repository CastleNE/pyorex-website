import config from '../../../src/data/scoring.json';

export async function onRequestGet() {
  return new Response(JSON.stringify({status:'success',engine:'PyOrex Relevance Engine',config}), {
    headers:{'content-type':'application/json; charset=utf-8','Cache-Control':'public, max-age=3600'}
  });
}
