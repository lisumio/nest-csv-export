import { Injectable } from '@nestjs/common'
import { SelectQueryBuilder } from 'typeorm'
import { Response } from 'express'
import { Transform } from 'stream'
import * as csv from 'fast-csv'

const DEFAULT_DELIMITER = ','

export type CsvExportResolver<Row, Ids extends string> = (
  row: Row,
) => Record<Ids, string>

type GetPropsOptions<Entity, Row, Ids extends string> = {
  filename: string
  query: SelectQueryBuilder<Entity>
  headings: Record<Ids, string>
  resolver: CsvExportResolver<Row, Ids>
  delimiter?: string
}

type CsvExportProps = {
  stream: Transform
  headers: Record<string, string>
}

@Injectable()
export class CsvExportService {
  async getProps<Entity, Row, Ids extends string>(
    options: GetPropsOptions<Entity, Row, Ids>,
  ): Promise<CsvExportProps> {
    const queryStream = await options.query.stream()

    const csvStream = csv.format({
      headers: true,
      delimiter: options.delimiter ?? DEFAULT_DELIMITER,
    })

    queryStream.on('data', (chunk) => {
      const parsedChunk = typeof chunk === 'string' ? JSON.parse(chunk) : chunk

      const resolvedRow = options.resolver(parsedChunk)

      const finalRow = Object.fromEntries(
        Object.entries(options.headings).map(([key, value]) => [
          value,
          resolvedRow[key],
        ]),
      )

      csvStream.write(finalRow)
    })

    queryStream.on('end', () => {
      csvStream.end()
    })

    const headers = {
      'Content-type': 'text/csv',
      'Content-disposition': `attachment; filename=${options.filename}`,
    }

    return { stream: csvStream, headers }
  }

  handle(res: Response, props: CsvExportProps): Promise<unknown> {
    props.stream.pipe(res)

    res.set(props.headers)

    return new Promise((resolve, reject) => {
      props.stream.on('error', reject)
      props.stream.on('end', resolve)
    })
  }
}
