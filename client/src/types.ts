export type TxType = 'expense' | 'income'
export type AccountType = 'courant' | 'epargne' | 'cash'

export interface Account {
  id: number
  name: string
  type: AccountType
  currency: string
  initial_balance: number
  created_at?: string
  balance?: number
  income?: number
  expense?: number
}

export interface Category {
  id: number
  name: string
  type: TxType
  color: string
}

export interface Transaction {
  id: number
  account_id: number
  category_id: number | null
  type: TxType
  amount: number
  date: string
  label: string
  note: string | null
  category_name?: string
  category_color?: string
  account_name?: string
  fixed?: boolean
}

export interface Recurring {
  id: number
  label: string
  type: TxType
  amount: number
  date_day: number
  category_id: number | null
  account_id: number
  active: boolean
  category_name?: string | null
  category_color?: string | null
  account_name?: string
  tx_id?: number | null
  tx_date?: string | null
  generated: boolean
}

export interface Budget {
  id?: number
  category_id: number
  month: string
  amount: number
  category_name: string
  category_color: string
  category_type: TxType
  spent: number
}

export interface CategoryTotal {
  category_id: number | null
  name: string
  color: string
  count: number
  total: number
}

export interface MonthEvolution {
  month: string
  income: number
  expense: number
}

export interface BudgetStatus {
  category_id: number
  name: string
  color: string
  budget: number
  spent: number
  remaining: number
  ratio: number
}

export interface AccountBalance {
  id: number
  name: string
  type: AccountType
  balance: number
}

export interface Summary {
  month: string
  income: number
  expense: number
  net: number
  byCategory: CategoryTotal[]
  evolution: MonthEvolution[]
  budgets: BudgetStatus[]
  accounts: AccountBalance[]
}
