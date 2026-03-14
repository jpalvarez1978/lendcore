/**
 * Calcular interés simple para un período
 */
export function calculateSimpleInterest(
  principal: number,
  rate: number,
  periods: number
): number {
  return principal * rate * periods
}

/**
 * Calcular interés compuesto
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  periods: number
): number {
  return principal * Math.pow(1 + rate, periods) - principal
}

/**
 * Convertir tasa anual a mensual
 */
export function annualToMonthlyRate(annualRate: number): number {
  return annualRate / 12
}

/**
 * Convertir tasa mensual a anual
 */
export function monthlyToAnnualRate(monthlyRate: number): number {
  return monthlyRate * 12
}

/**
 * Calcular TIR (Tasa Interna de Retorno)
 */
export function calculateIRR(
  cashFlows: number[],
  initialGuess: number = 0.1
): number {
  const maxIterations = 1000
  const tolerance = 0.0001
  let rate = initialGuess

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0
    let dnpv = 0

    for (let j = 0; j < cashFlows.length; j++) {
      npv += cashFlows[j] / Math.pow(1 + rate, j)
      dnpv -= (j * cashFlows[j]) / Math.pow(1 + rate, j + 1)
    }

    const newRate = rate - npv / dnpv

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate
    }

    rate = newRate
  }

  return rate
}

/**
 * Calcular cuota fija mensual (método francés)
 */
export function calculateFixedMonthlyPayment(
  principal: number,
  monthlyRate: number,
  numberOfPayments: number
): number {
  if (monthlyRate === 0) {
    return principal / numberOfPayments
  }

  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1)
  )
}
