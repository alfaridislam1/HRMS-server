import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogGroupCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';
import { logger } from '@config/logger';

/**
 * AWS CloudWatch Integration
 * Logs and metrics for production monitoring
 */

let cloudWatchLogsClient: CloudWatchLogsClient | null = null;
let cloudWatchClient: CloudWatchClient | null = null;

/**
 * Initialize CloudWatch clients
 */
function getCloudWatchLogsClient(): CloudWatchLogsClient {
    if (!cloudWatchLogsClient) {
        cloudWatchLogsClient = new CloudWatchLogsClient({
            region: process.env.AWS_REGION || 'ap-south-1',
        });
    }
    return cloudWatchLogsClient;
}

function getCloudWatchClient(): CloudWatchClient {
    if (!cloudWatchClient) {
        cloudWatchClient = new CloudWatchClient({
            region: process.env.AWS_REGION || 'ap-south-1',
        });
    }
    return cloudWatchClient;
}

/**
 * Ensure CloudWatch log group exists
 */
async function ensureLogGroup(logGroupName: string): Promise<void> {
    const client = getCloudWatchLogsClient();
    
    try {
        await client.send(new CreateLogGroupCommand({
            logGroupName,
        }));
        logger.debug(`Created CloudWatch log group: ${logGroupName}`);
    } catch (error: any) {
        if (error.name !== 'ResourceAlreadyExistsException') {
            logger.error(`Failed to create log group ${logGroupName}:`, error);
            throw error;
        }
    }
}

/**
 * Ensure CloudWatch log stream exists
 */
async function ensureLogStream(logGroupName: string, logStreamName: string): Promise<void> {
    const client = getCloudWatchLogsClient();
    
    try {
        await client.send(new CreateLogStreamCommand({
            logGroupName,
            logStreamName,
        }));
        logger.debug(`Created CloudWatch log stream: ${logStreamName}`);
    } catch (error: any) {
        if (error.name !== 'ResourceAlreadyExistsException') {
            logger.error(`Failed to create log stream ${logStreamName}:`, error);
            throw error;
        }
    }
}

/**
 * Send log events to CloudWatch
 */
export async function sendLogToCloudWatch(
    logGroupName: string,
    logStreamName: string,
    message: string,
    level: 'info' | 'warn' | 'error' = 'info'
): Promise<void> {
    try {
        await ensureLogGroup(logGroupName);
        await ensureLogStream(logGroupName, logStreamName);
        
        const client = getCloudWatchLogsClient();
        const timestamp = Date.now();
        
        await client.send(new PutLogEventsCommand({
            logGroupName,
            logStreamName,
            logEvents: [
                {
                    timestamp,
                    message: JSON.stringify({
                        level,
                        message,
                        timestamp: new Date(timestamp).toISOString(),
                        service: 'hrms-backend',
                    }),
                },
            ],
        }));
    } catch (error: any) {
        logger.error('Failed to send log to CloudWatch:', error);
        // Don't throw - logging failures shouldn't break the app
    }
}

/**
 * Send custom metric to CloudWatch
 */
export async function sendMetricToCloudWatch(
    metricName: string,
    value: number,
    unit: 'Count' | 'Bytes' | 'Seconds' | 'Percent' = 'Count',
    dimensions?: Record<string, string>
): Promise<void> {
    try {
        const client = getCloudWatchClient();
        const namespace = process.env.CLOUDWATCH_NAMESPACE || 'HRMS';
        
        await client.send(new PutMetricDataCommand({
            Namespace: namespace,
            MetricData: [
                {
                    MetricName: metricName,
                    Value: value,
                    Unit: unit,
                    Timestamp: new Date(),
                    ...(dimensions && {
                        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({
                            Name,
                            Value,
                        })),
                    }),
                },
            ],
        }));
    } catch (error: any) {
        logger.error(`Failed to send metric ${metricName} to CloudWatch:`, error);
        // Don't throw - metric failures shouldn't break the app
    }
}

/**
 * Common CloudWatch metrics helpers
 */
export const CloudWatchMetrics = {
    /**
     * Track API request
     */
    trackRequest: async (method: string, path: string, statusCode: number, duration: number) => {
        await sendMetricToCloudWatch('APIRequests', 1, 'Count', {
            Method: method,
            Path: path,
            StatusCode: statusCode.toString(),
        });
        
        await sendMetricToCloudWatch('APIResponseTime', duration, 'Seconds', {
            Method: method,
            Path: path,
        });
    },
    
    /**
     * Track database query
     */
    trackDatabaseQuery: async (queryType: string, duration: number) => {
        await sendMetricToCloudWatch('DatabaseQueries', 1, 'Count', {
            QueryType: queryType,
        });
        
        await sendMetricToCloudWatch('DatabaseQueryTime', duration, 'Seconds', {
            QueryType: queryType,
        });
    },
    
    /**
     * Track authentication event
     */
    trackAuth: async (event: 'login' | 'logout' | 'token_refresh', success: boolean) => {
        await sendMetricToCloudWatch('AuthEvents', 1, 'Count', {
            Event: event,
            Success: success.toString(),
        });
    },
    
    /**
     * Track error
     */
    trackError: async (errorType: string, errorCode?: string) => {
        await sendMetricToCloudWatch('Errors', 1, 'Count', {
            ErrorType: errorType,
            ...(errorCode && { ErrorCode: errorCode }),
        });
    },
};
