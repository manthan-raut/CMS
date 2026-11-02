import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import {
  monthlyRentPayable,
  monthlyAdvancePayable,
  projectWiseRooms,
  yearWisePayments,
  roomLedger,
  activeRoomsReport as activeRooms,
  closedRoomsReport as closedRooms,
  pendingHodApproval,
  rentDueReport as rentDue,
  agreementExpiryReport as agreementExpiry,
  ownerWiseReport as ownerWise,
  cityWiseReport as cityWise,
  brokerageReport as brokeragePayment,
} from './rentReports.controller';
import { requireRole } from '../../middleware/requireRole';

import { 
  projectWiseExpense,
  expenseHeadWise,
  projectAndHeadWise,
  employeeWise,
  managerApprovalStats,
  advanceVsSettlement,
  pendingApprovals,
  paymentStatus
} from './remsReports.controller';

const router = Router();

router.use(authenticate);

// --- Phase 2: RMS-Rent Reports ---
router.get('/rent/monthly-rent-payable', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), monthlyRentPayable);
router.get('/rent/monthly-advance-payable', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), monthlyAdvancePayable);
router.get('/rent/project-wise-rooms', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), projectWiseRooms);
router.get('/rent/year-wise-payments', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), yearWisePayments);
router.get('/rent/room-ledger', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD', 'PROJECT_MANAGER'), roomLedger);
router.get('/rent/active-rooms', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD', 'PROJECT_MANAGER'), activeRooms);
router.get('/rent/closed-rooms', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD', 'PROJECT_MANAGER'), closedRooms);
router.get('/rent/pending-hod-approval', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), pendingHodApproval);
router.get('/rent/rent-due', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), rentDue);
router.get('/rent/agreement-expiry', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD', 'PROJECT_MANAGER'), agreementExpiry);
router.get('/rent/owner-wise', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), ownerWise);
router.get('/rent/city-wise', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), cityWise);
router.get('/rent/brokerage', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), brokeragePayment);

// --- Phase 3: ReMS Reports ---
router.get('/rems/project-wise', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), projectWiseExpense);
router.get('/rems/expense-head-wise', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), expenseHeadWise);
router.get('/rems/project-and-head-wise', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), projectAndHeadWise);
router.get('/rems/employee-wise', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), employeeWise);
router.get('/rems/manager-approval', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), managerApprovalStats);
router.get('/rems/advance-vs-settlement', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), advanceVsSettlement);
router.get('/rems/pending-approvals', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), pendingApprovals);
router.get('/rems/payment-status', requireRole('FINANCE_MANAGER', 'HR_ADMIN', 'HOD'), paymentStatus);

export default router;
