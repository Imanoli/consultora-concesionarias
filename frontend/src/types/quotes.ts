export type PaymentMethod = 'efectivo' | 'financiado' | 'permuta' | 'mixto'

export interface Quote {
  id:                       number
  clientId:                 string
  publicToken:              string
  status:                   string
  kommoLeadId:              string | null
  kommoNoteStatus:          string | null
  customerName:             string
  customerPhone:            string | null
  customerEmail:            string | null
  customerDni:              string | null
  saleMake:                 string
  saleModel:                string
  saleVersion:              string | null
  saleYear:                 number
  saleKm:                   number | null
  salePrice:                string
  saleCurrency:              string
  tradeInMake:              string | null
  tradeInModel:             string | null
  tradeInYear:              number | null
  tradeInKm:                number | null
  tradeInValue:             string | null
  paymentMethod:            PaymentMethod
  financingEntity:          string | null
  financingDownPayment:     string | null
  financingInstallments:    number | null
  financingInstallmentAmt:  string | null
  financingNotes:           string | null
  totalAmount:              string
  createdByEmail?:          string | null
  sentAt:                   string | null
  createdAt:                string
  updatedAt:                string
}

export interface CreateQuotePayload {
  clientId:       string
  kommoLeadId?:   string
  customerName:   string
  customerPhone?: string
  customerEmail?: string
  customerDni?:   string
  sale: {
    make:     string
    model:    string
    version?: string
    year:     number
    km?:      number
    price:    number
    currency: string
  }
  tradeIn?: {
    make:  string
    model: string
    year:  number
    km?:   number
    value: number
  }
  paymentMethod:  PaymentMethod
  financing?: {
    entity?:            string
    downPayment?:       number
    installments?:      number
    installmentAmount?: number
    notes?:              string
  }
  totalAmount:    number
  createdByEmail?: string
}

export interface QuotePrefill {
  name:  string | null
  email: string | null
  phone: string | null
}
