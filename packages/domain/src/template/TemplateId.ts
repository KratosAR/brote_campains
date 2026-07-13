import { UniqueId } from '../shared/UniqueId'

export class TemplateId extends UniqueId {
  static generate(): TemplateId {
    return new TemplateId(UniqueId.generate().toString())
  }

  static from(value: string): TemplateId {
    return new TemplateId(value)
  }
}
