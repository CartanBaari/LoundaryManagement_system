export const FINANCE_UPDATED_EVENT = "lms:finance-updated"

export function notifyFinanceUpdated(detail = {}) {
  if (typeof window === "undefined") return
  window.dispatchEvent(
    new CustomEvent(FINANCE_UPDATED_EVENT, {
      detail: {
        at: Date.now(),
        ...detail,
      },
    })
  )
}

export function subscribeFinanceUpdated(handler) {
  if (typeof window === "undefined") return () => {}

  const listener = (event) => handler(event.detail || {})
  window.addEventListener(FINANCE_UPDATED_EVENT, listener)
  return () => window.removeEventListener(FINANCE_UPDATED_EVENT, listener)
}
