import { Module } from '@nestjs/common';
import { CalculatorDataService } from './calculator-data.service';
import { CalculatorDataController } from './calculator-data.controller';

@Module({
  controllers: [CalculatorDataController],
  providers: [CalculatorDataService],
  exports: [CalculatorDataService],
})
export class CalculatorDataModule {}
