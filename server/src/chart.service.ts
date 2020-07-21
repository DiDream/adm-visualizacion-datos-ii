import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { ConfigService } from '@nestjs/config';

export interface IChartArguments {
    url: string,
    xAxis: string,
    yAxis: string,
    chartType: string,
    dataBase64: {
        filename: string,
        filetype: string
        value: string
    }
}

@Injectable()
export class ChartService {
    constructor(
        private readonly configService: ConfigService
    ) {}

    public async getBase64(chartArguments: IChartArguments) {
        return new Promise((resolve, reject) => {
            const chartGenerator = spawn(this.configService.get('PYTHON_COMMAND') || 'python3', [
                    this.configService.get('SCRIPT_PATH'),
                    '--base64',
                    '--x-axis', chartArguments.xAxis,
                    '--y-axis', chartArguments.yAxis,
                    '--chart-type', chartArguments.chartType,
                    ...(chartArguments.url ? ['--url', chartArguments.url] : [])
                ]
            );

            if (chartArguments.dataBase64) {
                const buffer = Buffer.from(chartArguments.dataBase64.value, 'base64');
                const data = buffer.toString('utf-8');
                chartGenerator.stdin.write(data);
                chartGenerator.stdin.end();
            }

            let base64ChartImage = '';
            let errorBuffer = '';

            chartGenerator.stdout.on('data', data => {
                base64ChartImage += data.toString();
            })

            chartGenerator.on('close', (code) => {
                if (code != 0) {
                    return reject(new Error(errorBuffer || 'Error durante la ejecución del script'));
                }
                resolve(base64ChartImage);
            });

            chartGenerator.stderr.on('data', (data) => {
                errorBuffer += data.toString();
            });

            chartGenerator.on('error', (err) => {
                reject(err);
            });
        })

    }
}