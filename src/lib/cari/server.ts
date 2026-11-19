import "server-only";

export {
  createSupabaseCariAuditLogger,
  createSupabaseCariRepository,
  type CariAuditEntry,
  type CariAuditLogger,
  type CariRepository,
  type CariSupabaseClient,
} from "./repo";

export {
  CariServiceError,
  buildCariShareUrl,
  createCariAccount,
  deleteTrialCariAccount,
  executeB2BHotSale,
  generateStandingOrdersForDate,
  getCariAccountDetail,
  getCariLastOrder,
  getCustomerStatement,
  getSlipDetail,
  listCariAccounts,
  recordCariLedgerTransaction,
  revokeCariShareLinks,
  updateCariAccount,
  type CariActor,
  type CustomerStatementResult,
  type ParsedSlipItem,
  type SlipDetailData,
  type StandingOrdersGenerationResult,
} from "./useCases";
