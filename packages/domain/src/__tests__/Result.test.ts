import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'

describe('Result', () => {
  describe('ok', () => {
    it('isOk returns true', () => {
      expect(Result.ok(42).isOk()).toBe(true)
    })

    it('isFail returns false', () => {
      expect(Result.ok(42).isFail()).toBe(false)
    })

    it('getValue returns the value', () => {
      expect(Result.ok(42).getValue()).toBe(42)
    })

    it('getError throws', () => {
      expect(() => Result.ok(42).getError()).toThrow()
    })

    it('map transforms the value', () => {
      expect(Result.ok(42).map((n) => n * 2).getValue()).toBe(84)
    })

    it('flatMap chains results', () => {
      const result = Result.ok(10).flatMap((n) => Result.ok(n + 5))
      expect(result.getValue()).toBe(15)
    })
  })

  describe('fail', () => {
    const error = new ValidationError('invalid')

    it('isFail returns true', () => {
      expect(Result.fail(error).isFail()).toBe(true)
    })

    it('isOk returns false', () => {
      expect(Result.fail(error).isOk()).toBe(false)
    })

    it('getError returns the error', () => {
      expect(Result.fail(error).getError()).toBe(error)
    })

    it('getValue throws', () => {
      expect(() => Result.fail(error).getValue()).toThrow()
    })

    it('map preserves the failure', () => {
      const result = Result.fail(error).map((n: number) => n * 2)
      expect(result.isFail()).toBe(true)
      expect(result.getError()).toBe(error)
    })

    it('flatMap preserves the failure', () => {
      const result = Result.fail(error).flatMap((n: number) => Result.ok(n))
      expect(result.isFail()).toBe(true)
    })
  })
})
