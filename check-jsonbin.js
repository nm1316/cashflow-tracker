fetch(`https://api.jsonbin.io/v3/b/69d223dd856a682189ff28c7/latest`).then(res => res.json()).then(data => {
  console.log('Public JSONBin response:', JSON.stringify(data, null, 2));
}).catch(err => console.error(err));
