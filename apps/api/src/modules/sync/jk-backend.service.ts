import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

@Injectable()
export class JKBackendService {
    private readonly logger = new Logger(JKBackendService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    private async request(
        url: string,
        params: Record<string, any>,
        config: any,
        headers: Record<string, string> = {},
    ): Promise<any> {
        try {
            const { module, ...queryParams } = params;
            // The user's snippet shows module ONLY in the body, and the path starting with //
            const targetUrl = url;

            const body = new URLSearchParams();
            if (module) body.append('module', String(module));

            Object.keys(queryParams).forEach((key) => {
                body.append(key, String(queryParams[key]));
            });

            this.logger.debug(`JK API Request: POST ${targetUrl} Data: ${body.toString()}`);

            const requestConfig: any = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    ...headers,
                },
            };

            // Apply Proxy if configured 
            if (config?.proxy?.enabled && config.proxy.host && config.proxy.port) {
                const { protocol, host, port, username, password } = config.proxy;
                const authPrefix = username && password ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@` : '';
                const proxyUrl = `${protocol === 'socks5' ? 'socks5h' : 'http'}://${authPrefix}${host}:${port}`;

                this.logger.log(`Using proxy: ${protocol}://${host}:${port} for ${targetUrl}`);

                if (protocol === 'socks5') {
                    requestConfig.httpsAgent = new SocksProxyAgent(proxyUrl);
                    requestConfig.httpAgent = new SocksProxyAgent(proxyUrl);
                } else {
                    requestConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
                    requestConfig.httpAgent = new HttpsProxyAgent(proxyUrl);
                }

                // Disable Axios default proxy if using custom agent
                requestConfig.proxy = false;
            }

            // Important: Pass 'body' (URLSearchParams) directly, NOT body.toString()
            // Axios will automatically set the correct Content-Type and handle serialization
            const response = await firstValueFrom(
                this.httpService.post(targetUrl, body, requestConfig),
            );

            this.logger.debug(`JK API Response [${targetUrl}]: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            const errorUrl = url; // Fallback
            if (error.response) {
                this.logger.error(`Request failed [${errorUrl}]: ${error.message} - Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}`);
            } else {
                this.logger.error(`Request failed [${errorUrl}]: ${error.message}`);
            }
            throw error;
        }
    }

    async getUserDetail(config: any, userId: string) {
        // Determine API URL based on config or env
        let apiUrl = config.apiUrl || this.configService.get('JK_API_URL');
        if (apiUrl && apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
        }

        const accessId = config.accessId;
        const accessToken = config.accessToken;

        if (!apiUrl || !accessId || !accessToken) {
            throw new Error('Missing JK Configuration');
        }

        return this.request(`${apiUrl}//api/v1/index.php`, {
            module: '/users/getAllUsers',
            accessId,
            accessToken,
            id: userId,
        }, config);
    }

    async getAllUsers(config: any, pageIndex = 0, status = 'ACTIVE') {
        let apiUrl = config.apiUrl || this.configService.get('JK_API_URL');
        if (apiUrl && apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
        }

        const accessId = config.accessId;
        const accessToken = config.accessToken;

        // Merge custom params (agent, status, includeBetInfo, etc) from DB config
        const extraParams = config.syncParams || {};

        return this.request(`${apiUrl}//api/v1/index.php`, {
            module: '/users/getAllUsers',
            accessId,
            accessToken,
            pageIndex,
            status: extraParams.status || status, // Use config status if present, otherwise default to ACTIVE
            ...extraParams,
        }, config);
    }

    async getAllTransactions(config: any, pageIndex = 0, filters: any = {}) {
        let apiUrl = config.apiUrl || this.configService.get('JK_API_URL');
        if (apiUrl && apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
        }

        const accessId = config.accessId;
        const accessToken = config.accessToken;

        const extraParams = config.syncParams || {};

        // Calculate date range (configurable up to 30 days max, default 2)
        const eDate = new Date();
        const sDate = new Date();
        const syncDays = Math.min(Math.max(Number(config.syncConfigs?.['deposit']?.syncDays || 2), 1), 30);
        sDate.setDate(sDate.getDate() - syncDays);

        return this.request(`${apiUrl}//api/v1/index.php`, {
            module: '/transactions/getAllTransactions', // User said it must be exactly this
            accessId,
            accessToken,
            pageIndex,
            type: 'DEPOSIT', // Only fetch deposits
            sDate: sDate.toISOString().split('.')[0] + 'Z', // e.g. 2021-02-22T00:00:00Z
            eDate: eDate.toISOString().split('.')[0] + 'Z',
            ...filters, // Pass explicit filters like id or userId for webhook validation
            ...extraParams,
        }, config);
    }
}
