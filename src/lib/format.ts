export function formatKrw(n: number, fractionDigits = 0): string {
  return (
    new Intl.NumberFormat('ko-KR', {
      style: 'decimal',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(n) + ' KRW'
  )
}

export function formatPercent(rate: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(rate)
}
