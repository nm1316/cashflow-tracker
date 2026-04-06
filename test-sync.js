const BIN_ID = '69d223dd856a682189ff28c7';
const API_KEY = '$2a$10$QwwAuP12n..jYPPFfwVAZuEzgLY3mtZLdcE.Pac5OV/U12k8AQFqG';

// First get current data
fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
  method: 'GET',
  headers: { 'X-Master-Key': API_KEY }
})
  .then(res => res.json())
  .then(data => {
    const currentData = data.record;
    console.log('Current data count:', currentData.length);
    
    // Add a test transaction
    const testTx = {
      _id: 'test-' + Date.now(),
      date: '2026-04-01',
      description: 'TEST TRANSACTION - April 2026',
      amount: -99.99,
      type: 'Expense',
      paymentMethod: 'Card',
      month: 'April',
      year: 2026
    };
    
    currentData.push(testTx);
    console.log('After adding test:', currentData.length);
    
    // Upload back
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
    console.log('✅ Test transaction added!');
    console.log('New total:', result.record.length);
  })
  .catch(err => console.error('❌ Error:', err));
