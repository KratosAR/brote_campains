import { PhoneNumber } from '../shared/value-objects/PhoneNumber'

describe('PhoneNumber', () => {
  // Formatos locales argentinos (sin el 9 de celular) → E.164 sin 9
  const LOCAL_FORMATS = ['3511234567', '+54 351 1234567', '03511234567']
  const EXPECTED_E164 = '+543511234567'

  it.each(LOCAL_FORMATS)('normalizes local format "%s" to E.164', (input) => {
    const result = PhoneNumber.create(input)
    expect(result.isOk()).toBe(true)
    expect(result.getValue().toE164()).toBe(EXPECTED_E164)
  })

  // 5493511234567 incluye el 9 de celular → E.164 propio de WhatsApp
  it('preserves the 9 in 5493511234567 (WhatsApp mobile format)', () => {
    const result = PhoneNumber.create('5493511234567')
    expect(result.isOk()).toBe(true)
    expect(result.getValue().toE164()).toBe('+5493511234567')
  })

  it('two PhoneNumbers with the same number are equal', () => {
    const a = PhoneNumber.create('3511234567').getValue()
    const b = PhoneNumber.create('+543511234567').getValue()
    expect(a.equals(b)).toBe(true)
  })

  it('fails on empty string', () => {
    expect(PhoneNumber.create('').isFail()).toBe(true)
  })

  it('fails on invalid number', () => {
    expect(PhoneNumber.create('not-a-phone').isFail()).toBe(true)
  })

  it('fails on too short number', () => {
    expect(PhoneNumber.create('123').isFail()).toBe(true)
  })
})
