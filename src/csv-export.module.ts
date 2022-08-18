import { Module } from '@nestjs/common'

import { CsvExportService } from '@app/csv-export.service'

@Module({
  providers: [CsvExportService],
  exports: [CsvExportService],
})
export class CsvExportModule {}
