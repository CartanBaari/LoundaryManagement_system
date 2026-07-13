import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { expenseCategoryAPI, paymentMethodAPI } from "@/services/api"

export function usePaymentOptions({ enabled = true } = {}) {
  const [expenseCategories, setExpenseCategories] = useState([])
  const [incomeMethods, setIncomeMethods] = useState([])
  const [expenseMethods, setExpenseMethods] = useState([])
  const [allMethods, setAllMethods] = useState([])
  const [loading, setLoading] = useState(false)

  const loadOptions = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const [categoriesRes, incomeRes, expenseRes, allRes] = await Promise.all([
        expenseCategoryAPI.getAll({ activeOnly: true }),
        paymentMethodAPI.getAll({ activeOnly: true, type: "income" }),
        paymentMethodAPI.getAll({ activeOnly: true, type: "expense" }),
        paymentMethodAPI.getAll({ activeOnly: true }),
      ])

      setExpenseCategories(
        (categoriesRes.data?.categories || []).map((item) => ({
          value: item.slug,
          label: item.name,
          description: item.description,
          status: item.status,
        }))
      )

      const mapMethods = (items = []) =>
        items.map((item) => ({
          value: item.slug,
          label: item.name,
          description: item.description,
          type: item.type,
          status: item.status,
        }))

      setIncomeMethods(mapMethods(incomeRes.data?.methods || []))
      setExpenseMethods(mapMethods(expenseRes.data?.methods || []))
      setAllMethods(mapMethods(allRes.data?.methods || []))
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load payment options")
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    loadOptions()
  }, [loadOptions])

  return {
    expenseCategories,
    incomeMethods,
    expenseMethods,
    allMethods,
    loading,
    reload: loadOptions,
  }
}

export function labelFromOptions(options = [], value, fallback = "N/A") {
  if (!value) return fallback
  const match = options.find((option) => option.value === value)
  if (match) return match.label

  if (value === "mobile_money") {
    return options.find((o) => o.value === "evc_plus")?.label || "Mobile Money"
  }
  if (value === "bank") {
    return options.find((o) => o.value === "bank_transfer")?.label || "Bank"
  }

  return String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
