export class MetadataFilter {
  constructor(
    readonly name: string,
    readonly filter: Record<string, any> | string // TODO: type
  ) {}

  static default() {
    return new MetadataFilter('', {});
  }
}

export class QueryMetadata {
  constructor(
    readonly id: string,
    readonly data: Record<string, any> // TODO: type
  ) {}
}
