const BIN_ID = '69d223dd856a682189ff28c7';
const API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';
fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
  method: 'GET',
  headers: { 'X-Master-Key': API_KEY }
}).then(res => res.json()).then(data => {
  const t = data.record;
  const oct6 = t.filter(x => x.date === '2026-10-06' && x.description !== '');
  console.log('Total:', t.length);
  console.log('Oct 6:', JSON.stringify(oct6, null, 2));
  
  const fs = require('fs');
  fs.writeFileSync('recovered.json', JSON.stringify(oct6, null, 2));
}).catch(err => console.error(err));

