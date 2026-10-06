const BIN_ID = '69d223dd856a682189ff28c7';
const API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';

fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
  method: 'GET',
  headers: { 'X-Master-Key': API_KEY }
})
  .then(res => res.json())
  .then(data => {
    const currentData = data.record;
    console.log('Current:', currentData.length);
    
    // Add a test transaction to April
    currentData.push({
      _id: 'test-april-' + Date.now(),
      date: '2026-04-01',
      description: 'TEST - Please delete me',
      amount: -99.00,
      type: 'Expense',
      paymentMethod: 'Card',
      month: 'April',
      year: 2026
    });
    
    return fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': API_KEY,
      },
      body: JSON.stringify(currentData),
    });
  })
  .then(res => res.json())
  .then(result => {
    console.log('✅ Added test transaction to April');
    console.log('Total:', result.record.length);
  })
  .catch(err => console.error('Error:', err));
