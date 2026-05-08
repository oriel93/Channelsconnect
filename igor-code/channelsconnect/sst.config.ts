/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
    app(input) {
        return {
            name: "channels-connect",
            removal: input?.stage === "production" ? "retain" : "remove",
            protect: false,
            home: "aws",
            profile: "default",
            providers: {
                aws: {
                    region: "us-east-2",
                    profile: "default"
                },
            }
        };
    },

    async run() {
        // 1. Define the Secrets (The "Vault")
        const supabaseUrl = new sst.Secret("SUPABASE_URL");
        const supabaseKey = new sst.Secret("SUPABASE_ANON_KEY");
        const dbUrl = new sst.Secret("DATABASE_URL");
        const channexKey = new sst.Secret("CHANNEX_API_KEY");
        const channexWebhookSecret = new sst.Secret("CHANNEX_WEBHOOK_SECRET");
        const openaiApiKey = new sst.Secret("OPENAI_API_KEY");  // for chatbot InvokeLLM

        const vpc = new sst.aws.Vpc("Vpc");
        const cluster = new sst.aws.Cluster("Cluster", { vpc });

        // 2. API Service
        const api = new sst.aws.Service("Api", {
            cluster,
            link: [supabaseUrl, supabaseKey, dbUrl, channexKey, channexWebhookSecret],
            image: {
                context: "api",
                dockerfile: "Dockerfile",
            },
            loadBalancer: {
                ports: [
                    { listen: "80/http", forward: "3001/http" },
                    { listen: "443/https", forward: "3001/http" }
                ],
                domain: {
                    name: "api.channelsconnect.com",
                    dns: sst.aws.dns({
                        zone: "Z03480881XDJMYWR711XU"
                    })
                }
            },
            health: {
                command: ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
                interval: "30 seconds",
                timeout: "10 seconds",
                startPeriod: "60 seconds",  // grace period for NestJS cold-start
                retries: 3,
            },
            environment: {
                DATABASE_URL: dbUrl.value,
                SUPABASE_URL: supabaseUrl.value,
                SUPABASE_ANON_KEY: supabaseKey.value,
                CHANNEX_API_KEY: channexKey.value,
                CHANNEX_WEBHOOK_SECRET: channexWebhookSecret.value,
                FRONTEND_URL: "https://channelsconnect.com"
            },
            dev: {
                command: "npm run start:dev",
                directory: "api",
            },
        });

        // 3. Frontend
        const frontend = new sst.aws.StaticSite("Frontend", {
            path: "app",
            link: [supabaseUrl, supabaseKey, openaiApiKey],
            build: {
                command: "npm run build",
                output: "dist",
            },
            environment: {
                VITE_API_URL: api.url,
                VITE_SUPABASE_URL: supabaseUrl.value,
                VITE_SUPABASE_ANON_KEY: supabaseKey.value,
                VITE_OPENAI_API_KEY: openaiApiKey.value,
            },
            dev: {
                command: "npm run dev",
                directory: "app",
            },
            domain: {
                name: "channelsconnect.com",
                dns: sst.aws.dns({
                    zone: "Z03480881XDJMYWR711XU"
                })
            }
        });

        return { url: frontend.url };
    },
});