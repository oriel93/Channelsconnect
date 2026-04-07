/// <reference path="./.sst/platform/config.d.ts" />

/*
sst deploy --stage production
sst dev
*/

export default $config({
    app(input) {
        return {
            name: "channels-connect",
            removal: input?.stage === "production" ? "retain" : "remove",
            protect: false,
            home: "aws",
            profile: "combine-parsers",
            providers: {
                aws: {
                    region: "us-east-2",
                    profile: "combine-parsers"
                },
            }
        };
    },

    async run() {
        const vpc = new sst.aws.Vpc("Vpc");
        const cluster = new sst.aws.Cluster("Cluster", { vpc });

        // API Service (HTTP internally)
        const api = new sst.aws.Service("Api", {
            cluster,
            image: {
                context: "api",
                dockerfile: "Dockerfile",
            },
            loadBalancer: {
                ports: [
                    { 
                        listen: "80/http", forward: "3001/http",
                    },
                    {   listen: "443/https", forward: "3001/http",
                    }
                ],
                domain: {
                    name: "api.channelsconnect.com",
                    dns: sst.aws.dns({
                        zone: "Z03480881XDJMYWR711XU"
                    })
                }
            },
            health: {
                command: ["CMD-SHELL", "curl -f http://localhost:3001/ || exit 1"],
                interval: "30 seconds",
                timeout: "10 seconds",
            },
            environment: {
                DATABASE_URL: process.env.DATABASE_URL || "",
                SUPABASE_URL: process.env.SUPABASE_URL || "",
                SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
                SUPABASE_WEBHOOK_SECRET: process.env.SUPABASE_WEBHOOK_SECRET || "",
                BEDS24_API_KEY: process.env.BEDS24_API_KEY || "",
                BEDS24_REFRESH_TOKEN: process.env.BEDS24_REFRESH_TOKEN || "",
                CHANNEX_API_KEY: process.env.CHANNEX_API_KEY || "",
                FRONTEND_URL: process.env.FRONTEND_URL || ""
            },
            dev: {
                command: "npm run start:dev",
                directory: "api",
            },

        });


        // Frontend through same Router (HTTPS)
        const frontend = new sst.aws.StaticSite("Frontend", {
            path: "app",
            build: {
                command: "npm run build",
                output: "dist",
            },
            environment: {
                VITE_API_URL: api.url,
                VITE_SUPABASE_URL: process.env.SUPABASE_URL || "",
                VITE_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
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
