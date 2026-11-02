const API_URL = 'http://localhost:3001/api';
let hodToken = '';
let financeToken = '';
let projectManagerToken = '';
let employeeToken = '';
let createdRoomId = '';

async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return data.data.accessToken;
}

async function api(path: string, method: string, token: string, body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data: any = await res.json();
  return { status: res.status, data };
}

async function run() {
  console.log('--- Starting E2E Tests ---');
  try {
    await login('hradmin@precisionmappinggis.com', 'Admin@1234'); // just checking it works
    hodToken = await login('hod@precisionmappinggis.com', 'Hod@1234');
    financeToken = await login('finance@precisionmappinggis.com', 'Finance@1234');
    projectManagerToken = await login('pm1@precisionmappinggis.com', 'Pm@1234');
    employeeToken = await login('manager@precisionmappinggis.com', 'Manager@1234'); // using reporting manager as employee

    console.log('✅ Logged in all roles');

    // T5.1: Room Lifecycle
    console.log('\n--- T5.1 Room Lifecycle ---');
    const roomRes = await api('/rooms', 'POST', projectManagerToken, {
      projectName: 'E2E Test Project',
      city: 'Test City',
      address: '123 Test St',
      electricityIncluded: false,
      waterIncluded: true,
      startDate: new Date().toISOString(),
      monthlyRent: 15000,
      deposit: 30000,
      occupancyCapacity: 2,
      owner: { name: 'Test Owner', mobile: '9999999999' }
    });
    if (roomRes.status !== 201) throw new Error('Room creation failed: ' + JSON.stringify(roomRes.data));
    createdRoomId = roomRes.data.data.id;
    console.log('✅ Room created. Status:', roomRes.data.data.status);

    const approveRes = await api(`/rooms/${createdRoomId}/approve`, 'POST', hodToken, {
      monthlyRent: 14000
    });
    if (approveRes.status !== 200) throw new Error('Room approval failed');
    console.log('✅ Room approved by HOD. New Rent:', approveRes.data.data.monthlyRent);

    const payRes = await api(`/rooms/${createdRoomId}/payments`, 'POST', financeToken, {
      roomId: createdRoomId,
      paymentMonth: new Date().getMonth() + 1,
      paymentYear: new Date().getFullYear(),
      rentAmount: 14000,
      paymentDate: new Date().toISOString(),
    });
    if (payRes.status !== 201) throw new Error('Rent payment failed: ' + JSON.stringify(payRes.data));
    console.log('✅ Rent paid for current month');

    // Security Test T5.5
    console.log('\n--- T5.5 Security & Role Enforcement ---');
    const unauthorizedRes = await api(`/rooms/${createdRoomId}/payments`, 'POST', projectManagerToken, {
      roomId: createdRoomId,
      paymentMonth: 1, paymentYear: 2026, rentAmount: 1000, paymentDate: new Date().toISOString()
    });
    if (unauthorizedRes.status !== 403) throw new Error('Role guard failed! PM should not be able to pay rent. Status: ' + unauthorizedRes.status + ' Data: ' + JSON.stringify(unauthorizedRes.data));
    console.log('✅ Role guard works: PM denied access to Finance route.');

    // T5.2: Advance Lifecycle
    console.log('\n--- T5.2 Advance Lifecycle ---');
    const advRes = await api('/advance-requests', 'POST', projectManagerToken, {
      projectName: 'Test Project',
      purpose: 'Travel',
      amount: 10000,
      expenseHead: 'Travel',
      expectedDate: new Date().toISOString()
    });
    if (advRes.status !== 201) throw new Error('Advance creation failed');
    const advId = advRes.data.data.id;
    console.log('✅ Advance submitted');

    const advApprove = await api(`/advance-requests/${advId}/approve`, 'POST', employeeToken, {
      managerRemark: 'Looks good'
    });
    if (advApprove.status !== 200) throw new Error('Advance approve failed: ' + JSON.stringify(advApprove.data));
    console.log('✅ Advance approved by Manager');

    const advPay = await api(`/advance-requests/${advId}/process-payment`, 'POST', financeToken, {
      financeRemark: 'Paid today'
    });
    if (advPay.status !== 200) throw new Error('Advance pay failed');
    console.log('✅ Advance paid by Finance');

    // T5.3: Reimbursement Lifecycle
    console.log('\n--- T5.3 & T5.4 Reimbursement Lifecycle & Rules ---');
    const reimbRes = await api('/reimbursements', 'POST', projectManagerToken, {
      projectName: 'Test Project',
      travelActivityDetails: 'Client visit',
      totalAmount: 15000,
      expenses: [
        { expenseHead: 'Travel', amount: 4000, expenseDate: new Date().toISOString(), billType: 'INVOICE', documentUrl: '/dummy' },
        { expenseHead: 'Food', amount: 6000, expenseDate: new Date().toISOString(), billType: 'CASH_VOUCHER', documentUrl: '/dummy' }, // This should fail!
      ]
    });
    if (reimbRes.status !== 400) throw new Error('Business rule failed! Cash voucher > 5000 was allowed.');
    console.log('✅ Business rule works: Cash voucher > 5000 denied.');

    const reimbRes2 = await api('/reimbursements', 'POST', projectManagerToken, {
      projectName: 'Test Project',
      travelActivityDetails: 'Client visit',
      totalAmount: 9000,
      expenses: [
        { expenseHead: 'Travel', amount: 4000, expenseDate: new Date().toISOString(), billType: 'INVOICE', documentUrl: '/dummy' },
        { expenseHead: 'Food', amount: 5000, expenseDate: new Date().toISOString(), billType: 'CASH_VOUCHER', documentUrl: '/dummy' }, 
      ]
    });
    if (reimbRes2.status !== 201) throw new Error('Reimbursement creation failed: ' + JSON.stringify(reimbRes2.data));
    console.log('✅ Reimbursement submitted with valid data');

    console.log('\n✅ All E2E scenarios passed!');
  } catch (err) {
    console.error('❌ E2E Test Failed:', err);
  }
}

run();
