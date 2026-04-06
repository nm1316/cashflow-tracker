export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if (url.pathname === '/data' && request.method === 'GET') {
      const data = await env.CASHFLOW_KV.get('transactions');
      return new Response(data || '[]', {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    if (url.pathname === '/data' && request.method === 'PUT') {
      const body = await request.text();
      await env.CASHFLOW_KV.put('transactions', body);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    return new Response('Cashflow API - Use /data endpoint', { 
      headers: { 'Access-Control-Allow-Origin': '*' } 
    });
  }
};
