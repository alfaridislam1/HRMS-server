import { Request, Response, NextFunction } from 'express';
import { logger } from '@config/logger';
import axios from 'axios';
import jwt from 'jsonwebtoken';

/**
 * OAuth2 Authentication Middleware
 * Supports multiple OAuth2 providers (Google, Microsoft, GitHub, etc.)
 */

export interface OAuth2Provider {
    name: string;
    clientId: string;
    clientSecret: string;
    authorizationUrl: string;
    tokenUrl: string;
    userInfoUrl: string;
    scope: string[];
    redirectUri: string;
}

export interface OAuth2TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope?: string;
}

export interface OAuth2UserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
    provider: string;
}

/**
 * OAuth2 Service
 */
export class OAuth2Service {
    private providers: Map<string, OAuth2Provider> = new Map();

    /**
     * Register OAuth2 provider
     */
    registerProvider(provider: OAuth2Provider): void {
        this.providers.set(provider.name, provider);
        logger.info(`Registered OAuth2 provider: ${provider.name}`);
    }

    /**
     * Get authorization URL for provider
     */
    getAuthorizationUrl(providerName: string, state?: string): string {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`OAuth2 provider ${providerName} not found`);
        }

        const params = new URLSearchParams({
            client_id: provider.clientId,
            redirect_uri: provider.redirectUri,
            response_type: 'code',
            scope: provider.scope.join(' '),
            ...(state && { state }),
        });

        return `${provider.authorizationUrl}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    async exchangeCode(providerName: string, code: string): Promise<OAuth2TokenResponse> {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`OAuth2 provider ${providerName} not found`);
        }

        try {
            const response = await axios.post(
                provider.tokenUrl,
                {
                    code,
                    client_id: provider.clientId,
                    client_secret: provider.clientSecret,
                    redirect_uri: provider.redirectUri,
                    grant_type: 'authorization_code',
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            return response.data;
        } catch (error: any) {
            logger.error(`OAuth2 token exchange failed for ${providerName}:`, error);
            throw new Error(`Failed to exchange authorization code: ${error.message}`);
        }
    }

    /**
     * Get user info from OAuth2 provider
     */
    async getUserInfo(providerName: string, accessToken: string): Promise<OAuth2UserInfo> {
        const provider = this.providers.get(providerName);
        if (!provider) {
            throw new Error(`OAuth2 provider ${providerName} not found`);
        }

        try {
            const response = await axios.get(provider.userInfoUrl, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            // Map provider-specific response to standard format
            return this.mapUserInfo(providerName, response.data);
        } catch (error: any) {
            logger.error(`OAuth2 user info fetch failed for ${providerName}:`, error);
            throw new Error(`Failed to fetch user info: ${error.message}`);
        }
    }

    /**
     * Map provider-specific user info to standard format
     */
    private mapUserInfo(providerName: string, data: any): OAuth2UserInfo {
        const mappings: Record<string, (data: any) => OAuth2UserInfo> = {
            google: (data) => ({
                id: data.sub || data.id,
                email: data.email,
                name: data.name,
                picture: data.picture,
                provider: 'google',
            }),
            microsoft: (data) => ({
                id: data.id || data.sub,
                email: data.mail || data.userPrincipalName,
                name: data.displayName,
                picture: undefined,
                provider: 'microsoft',
            }),
            github: (data) => ({
                id: data.id.toString(),
                email: data.email,
                name: data.name || data.login,
                picture: data.avatar_url,
                provider: 'github',
            }),
        };

        const mapper = mappings[providerName];
        if (!mapper) {
            throw new Error(`No user info mapper for provider ${providerName}`);
        }

        return mapper(data);
    }
}

// Singleton instance
export const oauth2Service = new OAuth2Service();

/**
 * Initialize OAuth2 providers from environment variables
 */
export function initializeOAuth2Providers(): void {
    // Google OAuth2
    if (process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET) {
        oauth2Service.registerProvider({
            name: 'google',
            clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
            clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
            authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
            scope: ['openid', 'profile', 'email'],
            redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/google/callback',
        });
    }

    // Microsoft OAuth2
    if (process.env.MICROSOFT_OAUTH_CLIENT_ID && process.env.MICROSOFT_OAUTH_CLIENT_SECRET) {
        oauth2Service.registerProvider({
            name: 'microsoft',
            clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET,
            authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
            tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
            userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
            scope: ['openid', 'profile', 'email'],
            redirectUri: process.env.MICROSOFT_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/microsoft/callback',
        });
    }

    // GitHub OAuth2
    if (process.env.GITHUB_OAUTH_CLIENT_ID && process.env.GITHUB_OAUTH_CLIENT_SECRET) {
        oauth2Service.registerProvider({
            name: 'github',
            clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
            clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET,
            authorizationUrl: 'https://github.com/login/oauth/authorize',
            tokenUrl: 'https://github.com/login/oauth/access_token',
            userInfoUrl: 'https://api.github.com/user',
            scope: ['read:user', 'user:email'],
            redirectUri: process.env.GITHUB_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/oauth/github/callback',
        });
    }
}

/**
 * OAuth2 Callback Handler Middleware
 */
export function oauth2CallbackHandler(providerName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { code, state } = req.query;

            if (!code) {
                return res.status(400).json({
                    error: {
                        code: 'MISSING_CODE',
                        message: 'Authorization code is missing',
                    },
                });
            }

            // Exchange code for access token
            const tokenResponse = await oauth2Service.exchangeCode(providerName, code as string);

            // Get user info
            const userInfo = await oauth2Service.getUserInfo(providerName, tokenResponse.access_token);

            // Attach OAuth2 data to request
            (req as any).oauth2 = {
                provider: providerName,
                accessToken: tokenResponse.access_token,
                refreshToken: tokenResponse.refresh_token,
                userInfo,
            };

            next();
        } catch (error: any) {
            logger.error(`OAuth2 callback failed for ${providerName}:`, error);
            res.status(500).json({
                error: {
                    code: 'OAUTH2_ERROR',
                    message: error.message || 'OAuth2 authentication failed',
                },
            });
            return;
        }
    };
}

export default oauth2Service;
