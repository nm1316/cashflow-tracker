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
    
    // Keep only transactions with valid description
    const valid = currentData.filter(t => 
      t.description && t.description.trim().length > 0 && !t._id.includes('test-')
    );
    console.log('Valid:', valid.length);
    
    // Remove partial entries (description is just "viv" or too short)
    const cleaned = currentData.filter(t => {
      if (!t.description || t.description.trim().length < 3) return false;
      if (t._id.includes('test-')) return false;
      return true;
    });
    
    console.log('After cleaning:', cleaned.length);
    
    // Add back test transaction
    cleaned.push({
      _id: 'test-final-' + Date.now(),
      date: '2026-04-01',
      description: 'TEST TRANSACTION - April 2026 (CLEAN)',
      amount: -99.99,
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
      body: JSON.stringify(cleaned),
    });
  })
  .then(res => res.json())
  .then(result => {
    console.log('✅ Cleaned! Total:', result.record.length);
  })
  .catch(err => console.error('Error:', err));
