
// ============================ Cash-in Transaction with Paypack API ============================
const request = require("request");
const options = {
  method: "POST",
  url: "https://payments.paypack.rw/api/transactions/cashin",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: "Bearer {access_token}",
  },
  body: JSON.stringify({
    amount: 1000,
    number: "078xxxxxxx",
  }),
};
request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});

// Expected Outcome
// {
//   "amount": 1000,
//   "created_at": "2005-11-09T21:19:07.459Z",
//   "kind": "CASHIN",
//   "ref": "d0bb2807-1d52-4795-b373-3feaf63dceb1",
//   "status": "pending"
// }


// =========================== Cash Out  =====================================

var options = {
  method: "POST",
  url: "https://payments.paypack.rw/api/transactions/cashout",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: "Bearer {access_token}",
  },
  body: JSON.stringify({
    amount: 1000,
    number: "078xxxxxxx",
  }),
};
request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});

// Expected Output
// {
//   "amount": 1000,
//   "created_at": "2005-11-09T21:19:07.459Z",
//   "kind": "CASHOUT",
//   "ref": "d0bb2807-1d52-4795-b373-3feaf63dceb1",
//   "status": "pending"
// }

// ============================================ Finding Transaction ====================================

var options = {
  'method': 'GET',
  'url': 'https://payments.paypack.rw/api/transactions/find/{referenceKey}',
  'headers': {'Authorization': 'Bearer {access_token}'}
};

request(options, function (error, response) {
  if (error) throw new Error(error);
  console.log(response.body);
});

// Expected
// {
//   "amount": 1000,
//   "client": "078xxxxxxx",
//   "fee": 23,
//   "kind": "CASHOUT",
//   "merchant": "IJOK9F",
//   "ref": "d0bb2807-1d52-4795-b373-3feaf63dceb1",
//   "status": "pending",
//   "timestamp": "2014-05-16T08:28:06.801064-04:00"
// }



