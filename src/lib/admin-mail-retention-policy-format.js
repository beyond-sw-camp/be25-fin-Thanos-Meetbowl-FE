const DAYS_PER_YEAR = 365
const DAYS_PER_MONTH = 30
const MAX_YEARS = 10
const MAX_MONTHS = 11
const MIN_RETENTION_DAYS = 1
const MAX_RETENTION_DAYS = 3650

export function toRetentionDays(years, months) {
  // FE 드롭다운 선택값을 BE가 요구하는 일(day) 단위 정수로 환산한다.
  return Number(years) * DAYS_PER_YEAR + Number(months) * DAYS_PER_MONTH
}

export function fromRetentionDays(retentionDays) {
  const numericDays = Number(retentionDays)
  if (!Number.isFinite(numericDays) || numericDays <= 0) {
    return {
      years: 0,
      months: 0,
    }
  }

  let years = Math.floor(numericDays / DAYS_PER_YEAR)
  const remainingDays = numericDays % DAYS_PER_YEAR
  // 나머지 일수는 가장 가까운 개월 수로 반올림해 화면 드롭다운에 다시 매핑한다.
  let months = Math.round(remainingDays / DAYS_PER_MONTH)

  if (months >= 12) {
    years += 1
    months = 0
  }

  if (years > MAX_YEARS) {
    years = MAX_YEARS
    months = 0
  }

  return {
    years,
    months: Math.min(Math.max(months, 0), MAX_MONTHS),
  }
}

export function validateRetentionPeriod(years, months) {
  const numericYears = Number(years)
  const numericMonths = Number(months)

  if (!Number.isInteger(numericYears) || !Number.isInteger(numericMonths)) {
    return '보관 기간을 다시 선택해 주세요.'
  }

  if (numericYears < 0 || numericYears > MAX_YEARS || numericMonths < 0 || numericMonths > MAX_MONTHS) {
    return '보관 기간을 다시 선택해 주세요.'
  }

  const retentionDays = toRetentionDays(numericYears, numericMonths)
  // 화면 선택 조합이더라도 최종 저장 기준은 retentionDays 상한/하한으로 한 번 더 검증한다.
  if (retentionDays < MIN_RETENTION_DAYS || retentionDays > MAX_RETENTION_DAYS) {
    return `보관 기간은 ${MIN_RETENTION_DAYS}일 이상 ${MAX_RETENTION_DAYS}일 이하여야 합니다.`
  }

  return ''
}

export function formatRetentionPeriod(years, months) {
  // helper text와 현재 적용값 문구에서 동일한 표현을 재사용한다.
  return `${Number(years)}년 ${Number(months)}개월`
}

export {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  MAX_MONTHS,
  MAX_RETENTION_DAYS,
  MAX_YEARS,
  MIN_RETENTION_DAYS,
}
