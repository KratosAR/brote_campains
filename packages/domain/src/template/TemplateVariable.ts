import { ValueObject } from '../shared/ValueObject'

interface TemplateVariableProps {
  name: string
  required: boolean
  defaultValue?: string
}

export class TemplateVariable extends ValueObject<TemplateVariableProps> {
  private constructor(props: TemplateVariableProps) {
    super(props)
  }

  static create(name: string, required: boolean, defaultValue?: string): TemplateVariable {
    return new TemplateVariable({ name, required, defaultValue })
  }

  get name(): string {
    return this.props.name
  }

  get required(): boolean {
    return this.props.required
  }

  get defaultValue(): string | undefined {
    return this.props.defaultValue
  }
}
