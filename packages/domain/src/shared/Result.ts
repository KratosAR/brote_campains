type OkResult<T> = { ok: true; value: T }
type FailResult<E> = { ok: false; error: E }

export class Result<T, E> {
  private readonly state: OkResult<T> | FailResult<E>

  private constructor(state: OkResult<T> | FailResult<E>) {
    this.state = state
  }

  static ok<T>(value: T): Result<T, never> {
    return new Result<T, never>({ ok: true, value })
  }

  static fail<E>(error: E): Result<never, E> {
    return new Result<never, E>({ ok: false, error })
  }

  isOk(): this is Result<T, never> {
    return this.state.ok
  }

  isFail(): this is Result<never, E> {
    return !this.state.ok
  }

  getValue(): T {
    if (!this.state.ok) throw new Error('Cannot get value of a failed Result')
    return this.state.value
  }

  getError(): E {
    if (this.state.ok) throw new Error('Cannot get error of a successful Result')
    return this.state.error
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    if (!this.state.ok) return Result.fail(this.state.error) as Result<U, E>
    return Result.ok(fn(this.state.value))
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (!this.state.ok) return Result.fail(this.state.error) as Result<U, E>
    return fn(this.state.value)
  }
}
