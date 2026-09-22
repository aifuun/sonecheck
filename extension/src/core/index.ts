/**
 * Core Facade — the only entry the UI layer may import (`02` §1 Facade discipline).
 *
 * S2 exports the pure context builder; `riskEngine`, `threshold` and `config`
 * follow in S4/S5. Internal implementations stay private.
 */

export { buildContext, contextBudgetBytes } from './contextBuilder';
